"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type { IssuedDetermination } from "@/domain/determination/determination-experience";
import type { DeterminationLanguageDiagnostics } from "@/domain/determination/determination-diagnostics";
import {
  type FilingError,
  type FilingErrorCode,
  type FilingField,
  validateDraftField as validateChronologyDraftField,
} from "@/domain/filing/chronology";
import { validateDigitalConductDraftField } from "@/domain/filing/digital-conduct";
import { validateDomesticAffairsDraftField } from "@/domain/filing/domestic-affairs";
import { validateSocialPlanningDraftField } from "@/domain/filing/social-planning";
import {
  createEmptyFilingDraft,
  type Filing,
  type FilingDraft,
  validateFilingDraft,
} from "@/domain/filing/filing";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import type { AnalyticsPathCode } from "@/domain/observability/product-analytics";

import { CivicSeal } from "../application-shell/application-shell";
import {
  generationIdempotencyStorageKey,
  getOrCreateGenerationIdempotencyKey,
} from "../access/generation-idempotency";
import {
  determinationSessionKey,
  legacyDeterminationSessionKeyV4,
  LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
  LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
  LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
  parseDeterminationSession,
  serializeDeterminationSession,
} from "../determination/determination-session";
import {
  filingCompletionStorageKey,
  filingDraftStorageKey,
  LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY,
  LEGACY_DOMESTIC_DRAFT_STORAGE_KEY,
  LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY,
  parseFilingCompletion,
  parseStoredDraft,
  serializeFilingCompletion,
  serializeDraft,
} from "./draft-storage";
import {
  FILING_QUESTION_COUNT,
  type FilingStepCode,
  nextFilingStep,
  previousFilingStep,
  filingStepIndex,
} from "./filing-steps";
import { SurfaceObserver } from "../observability/surface-observer";
import {
  currentAnalyticsJourneyId,
  trackBrowserProductEvent,
} from "../observability/browser-product-analytics";

import { QuestionStep } from "./question-step";
import { format } from "./question-controls";

type FilingCopy = MessageCatalog["Filing"];
type NavigationCopy = MessageCatalog["Navigation"];

type CompleteFiling = (
  locale: InterfaceLocale,
  draft: unknown,
  idempotencyKey: unknown,
  journeyId?: unknown,
) => Promise<
  | {
      status: "accepted";
      determination: IssuedDetermination;
      diagnostics?: DeterminationLanguageDiagnostics;
    }
  | { status: "rejected"; errors: FilingError[] }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "failed" }
>;

interface FilingJourneyProps {
  locale: InterfaceLocale;
  step: FilingStepCode;
  returnToReview: boolean;
  determinationUnavailable?: boolean;
  evaluationAccess?: boolean;
  copy: FilingCopy;
  navigation: NavigationCopy;
  completeFiling: CompleteFiling;
}

type RecoveryNotice = "restored" | "expired" | "invalid" | null;

export const FILING_INTERNAL_NAVIGATION_STORAGE_KEY =
  "bpg:filing:internal-navigation:v1";

const FIELD_STEPS: Record<FilingField, FilingStepCode> = {
  department: "department",
  respondent: "respondent",
  relationship: "relationship",
  offence: "classification",
  chronology: "chronology",
  communications: "communications",
  domestic_evidence: "domestic_evidence",
  social_evidence: "social_evidence",
  impact: "impact",
  mitigation: "mitigation",
  statement: "statement",
};

const STEP_FIELDS: Partial<Record<FilingStepCode, FilingField>> = {
  respondent: "respondent",
  relationship: "relationship",
  department: "department",
  classification: "offence",
  chronology: "chronology",
  communications: "communications",
  domestic_evidence: "domestic_evidence",
  social_evidence: "social_evidence",
  impact: "impact",
  mitigation: "mitigation",
  statement: "statement",
};

export function FilingJourney({
  locale,
  step,
  returnToReview,
  determinationUnavailable = false,
  evaluationAccess = false,
  copy,
  navigation,
  completeFiling,
}: FilingJourneyProps) {
  const [draft, setDraft] = useState<FilingDraft>(createEmptyFilingDraft);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<RecoveryNotice>(null);
  const [error, setError] = useState<FilingErrorCode | null>(null);
  const [serverError, setServerError] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [generationLimited, setGenerationLimited] = useState<number | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const stepStartedAt = useRef<number | null>(null);
  const draftStorageKey = filingDraftStorageKey(locale);
  const completionStorageKey = filingCompletionStorageKey(locale);
  const currentDeterminationSessionKey = determinationSessionKey(locale);
  const previousDeterminationSessionKey =
    legacyDeterminationSessionKeyV4(locale);
  const currentGenerationIdempotencyKey = generationIdempotencyStorageKey(
    locale,
    draft.department,
  );

  useEffect(() => {
    stepStartedAt.current = Date.now();
    const timer = window.setTimeout(() => {
      const now = Date.now();
      const stored = parseStoredDraft(
        window.localStorage.getItem(draftStorageKey) ??
          (locale === "en"
            ? (window.localStorage.getItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY) ??
              window.localStorage.getItem(
                LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY,
              ) ??
              window.localStorage.getItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY))
            : null),
        now,
        locale,
      );
      const internalNavigationTarget = window.sessionStorage.getItem(
        FILING_INTERNAL_NAVIGATION_STORAGE_KEY,
      );
      window.sessionStorage.removeItem(FILING_INTERNAL_NAVIGATION_STORAGE_KEY);
      const completionStatus = parseFilingCompletion(
        window.localStorage.getItem(completionStorageKey),
        now,
        locale,
      );
      const storedDetermination = parseDeterminationSession(
        window.sessionStorage.getItem(currentDeterminationSessionKey) ??
          window.sessionStorage.getItem(previousDeterminationSessionKey) ??
          (locale === "en"
            ? (window.sessionStorage.getItem(
                LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
              ) ??
              window.sessionStorage.getItem(
                LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
              ) ??
              window.sessionStorage.getItem(
                LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
              ))
            : null),
        now,
        locale,
      );
      const validatedStoredDraft =
        stored.status === "restored"
          ? validateFilingDraft(stored.draft, locale)
          : null;
      const matchingCompletedSession =
        storedDetermination.status === "restored" &&
        validatedStoredDraft?.status === "valid" &&
        JSON.stringify(validatedStoredDraft.filing) ===
          JSON.stringify(storedDetermination.snapshot.filing);
      if (
        step === "respondent" &&
        internalNavigationTarget === null &&
        stored.status === "restored" &&
        (completionStatus === "completed" || matchingCompletedSession)
      ) {
        window.localStorage.removeItem(draftStorageKey);
        window.localStorage.removeItem(completionStorageKey);
        window.localStorage.removeItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY);
        window.sessionStorage.removeItem(currentDeterminationSessionKey);
        window.sessionStorage.removeItem(previousDeterminationSessionKey);
        window.sessionStorage.removeItem(
          LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
        );
        window.sessionStorage.removeItem(
          LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
        );
        window.sessionStorage.removeItem(
          LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
        );
        setDraft(createEmptyFilingDraft());
        setNotice(null);
        setHydrated(true);
        return;
      }
      if (completionStatus === "expired" || completionStatus === "invalid") {
        window.localStorage.removeItem(completionStorageKey);
      }
      setDraft(stored.draft);
      setNotice(
        stored.status === "empty" ||
          (stored.status === "restored" && internalNavigationTarget === step)
          ? null
          : stored.status,
      );
      if (stored.status === "expired" || stored.status === "invalid") {
        window.localStorage.removeItem(draftStorageKey);
        window.localStorage.removeItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY);
      } else if (stored.status === "restored") {
        window.localStorage.removeItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY);
      }
      setHydrated(true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [
    completionStorageKey,
    currentDeterminationSessionKey,
    draftStorageKey,
    locale,
    previousDeterminationSessionKey,
    step,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      draftStorageKey,
      serializeDraft(draft, Date.now(), locale),
    );
  }, [draft, draftStorageKey, hydrated, locale]);

  const pathFor = (target: FilingStepCode) => `/${locale}/file/${target}`;
  const questionIndex = filingStepIndex(step, draft.department);
  const showProgress =
    questionIndex >= 1 && questionIndex <= FILING_QUESTION_COUNT;
  const observedPathCode = analyticsPathCode(draft);

  function updateDraft(update: (current: FilingDraft) => FilingDraft) {
    window.localStorage.removeItem(completionStorageKey);
    window.sessionStorage.removeItem(currentDeterminationSessionKey);
    window.sessionStorage.removeItem(previousDeterminationSessionKey);
    window.sessionStorage.removeItem(LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY);
    window.sessionStorage.removeItem(
      LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(
      LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(currentGenerationIdempotencyKey);
    setDraft(update);
    setError(null);
    setServerError(false);
    setGenerationFailed(false);
    setGenerationLimited(null);
  }

  function navigate(target: FilingStepCode) {
    markInternalNavigation(target);
    window.location.assign(pathFor(target));
  }

  function markInternalNavigation(target: FilingStepCode) {
    window.sessionStorage.setItem(
      FILING_INTERNAL_NAVIGATION_STORAGE_KEY,
      target,
    );
  }

  function markInternalLinkNavigation(
    event: ReactMouseEvent<HTMLAnchorElement>,
    target: FilingStepCode,
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    markInternalNavigation(target);
  }

  function handleContinue(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = STEP_FIELDS[step];
    if (field) {
      const issue = validateActiveDraftField(field, draft, locale);
      if (issue) {
        setError(issue);
        trackBrowserProductEvent(
          {
            locale,
            name: "filing_validation_failed",
            properties: {
              step,
              reason: analyticsValidationReason(issue),
            },
          },
          draft.department,
        );
        return;
      }
    }
    const completedPathCode = analyticsPathCode(draft);
    const completionProperties = {
      step,
      direction: returnToReview
        ? ("review_correction" as const)
        : ("forward" as const),
      durationMs: Math.min(
        3_600_000,
        Math.max(0, Date.now() - (stepStartedAt.current ?? Date.now())),
      ),
    };
    trackBrowserProductEvent(
      {
        locale,
        name: "filing_step_completed",
        properties: completedPathCode
          ? { ...completionProperties, pathCode: completedPathCode }
          : completionProperties,
      },
      draft.department,
    );
    const next = nextFilingStep(step, draft.department);
    if (returnToReview) {
      navigate("review");
    } else if (next) {
      navigate(next);
    }
  }

  function handleComplete() {
    const localResult = validateFilingDraft(draft, locale);
    if (localResult.status === "invalid") {
      const first = localResult.errors[0];
      if (first) {
        setError(first.code);
        navigate(FIELD_STEPS[first.field]);
      }
      return;
    }

    setGenerationFailed(false);
    setGenerationLimited(null);
    setServerError(false);
    const pathCode = analyticsPathCode(localResult.filing);
    if (!pathCode) return;
    trackBrowserProductEvent(
      {
        locale,
        name: "filing_completion_requested",
        properties: { pathCode },
      },
      localResult.filing.department,
    );
    startTransition(async () => {
      try {
        const idempotencyKey = getOrCreateGenerationIdempotencyKey(
          window.sessionStorage,
          currentGenerationIdempotencyKey,
        );
        const journeyId = currentAnalyticsJourneyId();
        const result = journeyId
          ? await completeFiling(locale, draft, idempotencyKey, journeyId)
          : await completeFiling(locale, draft, idempotencyKey);
        if (result.status === "accepted") {
          const completedAt = Date.now();
          window.sessionStorage.removeItem(currentGenerationIdempotencyKey);
          window.localStorage.setItem(
            completionStorageKey,
            serializeFilingCompletion(completedAt, locale),
          );
          window.sessionStorage.setItem(
            currentDeterminationSessionKey,
            serializeDeterminationSession(
              draft,
              result.determination,
              completedAt,
              result.diagnostics ?? null,
            ),
          );
          window.location.assign(`/${locale}/determination`);
          return;
        }
        if (result.status === "rejected") {
          setServerError(true);
          return;
        }
        if (result.status === "limited") {
          setGenerationLimited(result.retryAfterSeconds);
          return;
        }
        setGenerationFailed(true);
      } catch {
        setGenerationFailed(true);
      }
    });
  }

  function resetDraft() {
    window.localStorage.removeItem(draftStorageKey);
    window.localStorage.removeItem(completionStorageKey);
    window.localStorage.removeItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(currentDeterminationSessionKey);
    window.sessionStorage.removeItem(previousDeterminationSessionKey);
    window.sessionStorage.removeItem(LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY);
    window.sessionStorage.removeItem(
      LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(
      LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(currentGenerationIdempotencyKey);
    setDraft(createEmptyFilingDraft());
    setNotice(null);
    setError(null);
    setServerError(false);
    setResetArmed(false);
    navigate("respondent");
  }

  const previous = previousFilingStep(step, draft.department);
  const departmentPending =
    step === "respondent" || step === "relationship" || step === "department";
  const serviceName = departmentPending
    ? copy.intakeServiceName
    : draft.department === "chronology"
      ? copy.serviceName
      : draft.department === "digital_conduct"
        ? copy.digitalServiceName
        : draft.department === "domestic_affairs"
          ? copy.domesticServiceName
          : copy.socialServiceName;
  const departmentName = departmentPending
    ? copy.intakeDepartment
    : draft.department === "chronology"
      ? copy.department
      : draft.department === "digital_conduct"
        ? copy.digitalDepartment
        : draft.department === "domestic_affairs"
          ? copy.domesticDepartment
          : copy.socialDepartment;

  return (
    <div className="filing-shell" data-locale={locale}>
      {hydrated ? (
        <SurfaceObserver
          locale={locale}
          surface={
            observedPathCode
              ? {
                  name: "filing",
                  department: draft.department,
                  step,
                  pathCode: observedPathCode,
                }
              : { name: "filing", department: draft.department, step }
          }
        />
      ) : null}
      <a className="skip-link" href="#filing-question">
        {copy.skipToContent}
      </a>
      <header className="filing-header">
        <a
          className="brand"
          href={`/${locale}`}
          aria-label={navigation.brandName}
        >
          <CivicSeal initial={navigation.brandInitial} />
          <span>
            <strong>{navigation.brandName}</strong>
            <small>{navigation.brandDescriptor}</small>
          </span>
        </a>
        <span className="filing-service-name">{serviceName}</span>
      </header>

      <main className="filing-main" id="filing-question">
        <aside className="filing-rail" aria-label={serviceName}>
          <p>{departmentName}</p>
          {showProgress ? (
            <>
              <span>
                {format(copy.progress, {
                  current: questionIndex,
                  total: FILING_QUESTION_COUNT,
                })}
              </span>
              <div className="progress-track" aria-hidden="true">
                <i
                  style={{
                    width: `${String((questionIndex / FILING_QUESTION_COUNT) * 100)}%`,
                  }}
                />
              </div>
            </>
          ) : null}
          <small>{copy.draftStatus}</small>
        </aside>

        <section className="filing-card" aria-busy={!hydrated}>
          {notice ? <RecoveryBanner notice={notice} copy={copy} /> : null}
          {determinationUnavailable ? (
            <div className="recovery-banner" role="status">
              <strong>{copy.determinationUnavailableTitle}</strong>
              <p>{copy.determinationUnavailableBody}</p>
            </div>
          ) : null}
          {evaluationAccess ? (
            <div className="recovery-banner" role="status">
              <strong>{copy.evaluationAccessTitle}</strong>
              <p>{copy.evaluationAccessBody}</p>
            </div>
          ) : null}
          {serverError ? (
            <p className="form-error form-error-wide" role="alert">
              {copy.errorServer}
            </p>
          ) : null}

          {step === "review" ? (
            generationLimited !== null ? (
              <DeterminationLimited
                copy={copy}
                locale={locale}
                retryAfterSeconds={generationLimited}
                onRetry={handleComplete}
                onReview={() => {
                  setGenerationLimited(null);
                }}
              />
            ) : generationFailed ? (
              <DeterminationFailure
                copy={copy}
                onRetry={handleComplete}
                onReview={() => {
                  setGenerationFailed(false);
                }}
              />
            ) : isPending && !serverError ? (
              <DeterminationLoading copy={copy} />
            ) : (
              <ReviewStep
                draft={draft}
                copy={copy}
                locale={locale}
                isPending={!hydrated}
                onComplete={handleComplete}
                onInternalNavigation={markInternalLinkNavigation}
              />
            )
          ) : (
            <form noValidate onSubmit={handleContinue}>
              <fieldset className="filing-fieldset" disabled={!hydrated}>
                <legend className="sr-only">{serviceName}</legend>
                <QuestionStep
                  locale={locale}
                  step={step}
                  hydrated={hydrated}
                  draft={draft}
                  copy={copy}
                  error={error}
                  updateDraft={updateDraft}
                  goToClassification={() => {
                    navigate("classification");
                  }}
                />
                <div className="filing-actions">
                  {returnToReview ? (
                    <a
                      className="text-action"
                      href={pathFor("review")}
                      onClick={(event) => {
                        markInternalLinkNavigation(event, "review");
                      }}
                    >
                      <span aria-hidden="true">←</span> {copy.back}
                    </a>
                  ) : previous ? (
                    <a
                      className="text-action"
                      href={pathFor(previous)}
                      onClick={(event) => {
                        markInternalLinkNavigation(event, previous);
                      }}
                    >
                      <span aria-hidden="true">←</span> {copy.back}
                    </a>
                  ) : (
                    <a className="text-action" href={`/${locale}`}>
                      <span aria-hidden="true">←</span> {copy.back}
                    </a>
                  )}
                  <button className="button button-primary" type="submit">
                    {step === "statement" ? copy.reviewRecord : copy.continue}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </fieldset>
            </form>
          )}

          <div className="draft-reset">
            {resetArmed ? (
              <div role="group" aria-label={copy.resetWarning}>
                <p>{copy.resetWarning}</p>
                <button type="button" disabled={!hydrated} onClick={resetDraft}>
                  {copy.confirmStartOver}
                </button>
                <button
                  type="button"
                  disabled={!hydrated}
                  onClick={() => {
                    setResetArmed(false);
                  }}
                >
                  {copy.cancelReset}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!hydrated}
                onClick={() => {
                  setResetArmed(true);
                }}
              >
                {copy.startOver}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function analyticsPathCode(
  draft: FilingDraft | Filing,
): AnalyticsPathCode | undefined {
  switch (draft.offence) {
    case "premature_departure":
      return "chronology_premature_departure";
    case "chronic_lateness":
      return "chronology_chronic_lateness";
    case "optimistic_estimate":
      return "chronology_optimistic_estimate";
    case "fragmented_messages":
      return "digital_conduct_fragmented_messages";
    case "excessive_voice_note":
      return "digital_conduct_excessive_voice_note";
    case "unacknowledged_coordination":
      return "digital_conduct_unacknowledged_coordination";
    case "token_remainder":
      return "domestic_affairs_token_remainder";
    case "misplaced_object":
      return "domestic_affairs_misplaced_object";
    case "empty_packaging":
      return "domestic_affairs_empty_packaging";
    case "option_veto_cycle":
      return "social_planning_option_veto_cycle";
    case "decision_drift":
      return "social_planning_decision_drift";
    case "confirmed_plan_revision":
      return "social_planning_confirmed_plan_revision";
    default:
      return undefined;
  }
}

function validateActiveDraftField(
  field: FilingField,
  draft: FilingDraft,
  locale: InterfaceLocale,
): FilingErrorCode | null {
  if (draft.department === "chronology")
    return validateChronologyDraftField(field, draft, locale);
  if (draft.department === "digital_conduct")
    return validateDigitalConductDraftField(field, draft, locale);
  return draft.department === "domestic_affairs"
    ? validateDomesticAffairsDraftField(field, draft, locale)
    : validateSocialPlanningDraftField(field, draft, locale);
}

function analyticsValidationReason(
  issue: FilingErrorCode,
): "required" | "invalid" | "restricted_content" {
  if (issue === "required") return "required";
  if (issue === "restricted_content" || issue === "unnecessary_identifier") {
    return "restricted_content";
  }
  return "invalid";
}

function DeterminationLimited({
  copy,
  locale,
  retryAfterSeconds,
  onRetry,
  onReview,
}: {
  copy: FilingCopy;
  locale: InterfaceLocale;
  retryAfterSeconds: number;
  onRetry: () => void;
  onReview: () => void;
}) {
  return (
    <div className="determination-failure" role="alert">
      <span className="failure-mark" aria-hidden="true">
        !
      </span>
      <p className="eyebrow">{copy.limitedKicker}</p>
      <h1>{copy.limitedTitle}</h1>
      <p className="question-intro">
        {format(copy.limitedBody, {
          seconds: new Intl.NumberFormat(locale).format(retryAfterSeconds),
        })}
      </p>
      <div className="filing-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onReview}
        >
          {copy.failureReview}
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={onRetry}
        >
          {copy.failureRetry}
        </button>
      </div>
    </div>
  );
}

interface ReviewStepProps {
  draft: FilingDraft;
  copy: FilingCopy;
  locale: InterfaceLocale;
  isPending: boolean;
  onComplete: () => void;
  onInternalNavigation: (
    event: ReactMouseEvent<HTMLAnchorElement>,
    target: FilingStepCode,
  ) => void;
}

function ReviewStep({
  draft,
  copy,
  locale,
  isPending,
  onComplete,
  onInternalNavigation,
}: ReviewStepProps) {
  const rows = [
    [copy.reviewRespondent, draft.respondent || "—", "respondent"],
    [
      copy.reviewRelationship,
      relationshipLabel(draft.relationship, copy),
      "relationship",
    ],
    [
      copy.reviewDepartment,
      draft.department === "chronology"
        ? copy.departmentChronology
        : draft.department === "digital_conduct"
          ? copy.departmentDigitalConduct
          : draft.department === "domestic_affairs"
            ? copy.departmentDomesticAffairs
            : copy.departmentSocialPlanning,
      "department",
    ],
    [
      copy.reviewClassification,
      offenceLabel(draft.offence, copy),
      "classification",
    ],
    [
      draft.department === "chronology"
        ? copy.reviewChronology
        : draft.department === "digital_conduct"
          ? copy.reviewCommunications
          : draft.department === "domestic_affairs"
            ? copy.reviewDomesticEvidence
            : copy.reviewSocialEvidence,
      evidenceSummary(draft, copy),
      draft.department === "chronology"
        ? "chronology"
        : draft.department === "digital_conduct"
          ? "communications"
          : draft.department === "domestic_affairs"
            ? "domestic_evidence"
            : "social_evidence",
    ],
    [copy.reviewImpact, impactLabel(draft.impact, copy), "impact"],
    [
      copy.reviewMitigation,
      mitigationLabel(draft.mitigation, copy),
      "mitigation",
    ],
    [copy.reviewStatement, draft.statement || "—", "statement"],
  ] as const;

  return (
    <>
      <p className="eyebrow">{copy.reviewKicker}</p>
      <h1>{copy.reviewTitle}</h1>
      <p className="question-intro">{copy.reviewBody}</p>
      <dl className="review-list">
        {rows.map(([label, value, target]) => (
          <div key={target}>
            <dt>{label}</dt>
            <dd>
              <span>{value}</span>
              <a
                href={`/${locale}/file/${target}?return=review`}
                onClick={(event) => {
                  onInternalNavigation(event, target);
                }}
              >
                {copy.correct}
              </a>
            </dd>
          </div>
        ))}
      </dl>
      <div className="review-boundary">
        <strong>{copy.reviewBoundaryTitle}</strong>
        <p>{copy.reviewBoundaryBody}</p>
      </div>
      <div className="filing-actions">
        <a
          className="text-action"
          href={`/${locale}/file/statement`}
          onClick={(event) => {
            onInternalNavigation(event, "statement");
          }}
        >
          <span aria-hidden="true">←</span> {copy.back}
        </a>
        <button
          className="button button-primary"
          type="button"
          disabled={isPending}
          onClick={onComplete}
        >
          {isPending ? copy.completing : copy.completeReview}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </>
  );
}

function DeterminationLoading({ copy }: { copy: FilingCopy }) {
  const statuses = [
    copy.processingFacts,
    copy.processingFactors,
    copy.processingRemedy,
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % statuses.length);
    }, 1_100);
    return () => {
      window.clearInterval(interval);
    };
  }, [statuses.length]);

  return (
    <div className="determination-processing" aria-live="polite" role="status">
      <span className="processing-seal" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <p className="eyebrow">{copy.processingKicker}</p>
      <h1>{copy.processingTitle}</h1>
      <p className="question-intro">{statuses[index]}</p>
      <span className="processing-boundary">{copy.processingBoundary}</span>
    </div>
  );
}

function DeterminationFailure({
  copy,
  onRetry,
  onReview,
}: {
  copy: FilingCopy;
  onRetry: () => void;
  onReview: () => void;
}) {
  return (
    <div className="determination-failure" role="alert">
      <span className="failure-mark" aria-hidden="true">
        !
      </span>
      <p className="eyebrow">{copy.failureKicker}</p>
      <h1>{copy.failureTitle}</h1>
      <p className="question-intro">{copy.failureBody}</p>
      <div className="filing-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onReview}
        >
          {copy.failureReview}
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={onRetry}
        >
          {copy.failureRetry}
        </button>
      </div>
    </div>
  );
}

function RecoveryBanner({
  notice,
  copy,
}: {
  notice: Exclude<RecoveryNotice, null>;
  copy: FilingCopy;
}) {
  const content =
    notice === "restored"
      ? [copy.restoredTitle, copy.restoredBody]
      : notice === "expired"
        ? [copy.expiredTitle, copy.expiredBody]
        : [copy.invalidDraftTitle, copy.invalidDraftBody];
  return (
    <div className="recovery-banner" role="status">
      <strong>{content[0]}</strong>
      <p>{content[1]}</p>
    </div>
  );
}

function relationshipLabel(
  value: FilingDraft["relationship"],
  copy: FilingCopy,
): string {
  return {
    friend: copy.relationshipFriend,
    partner: copy.relationshipPartner,
    roommate: copy.relationshipRoommate,
    colleague: copy.relationshipColleague,
    sibling: copy.relationshipSibling,
    "": "—",
  }[value];
}

function offenceLabel(value: FilingDraft["offence"], copy: FilingCopy): string {
  return {
    premature_departure: copy.offencePremature,
    chronic_lateness: copy.offenceLate,
    optimistic_estimate: copy.offenceEstimate,
    fragmented_messages: copy.offenceFragmentedMessages,
    excessive_voice_note: copy.offenceExcessiveVoiceNote,
    unacknowledged_coordination: copy.offenceUnacknowledgedCoordination,
    token_remainder: copy.offenceTokenRemainder,
    misplaced_object: copy.offenceMisplacedObject,
    empty_packaging: copy.offenceEmptyPackaging,
    option_veto_cycle: copy.offenceOptionVetoCycle,
    decision_drift: copy.offenceDecisionDrift,
    confirmed_plan_revision: copy.offenceConfirmedPlanRevision,
    "": "—",
  }[value];
}

function impactLabel(value: FilingDraft["impact"], copy: FilingCopy): string {
  return {
    table_held: copy.impactTable,
    repeated_updates: copy.impactUpdates,
    plans_compressed: copy.impactCompressed,
    notification_burden: copy.impactNotificationBurden,
    coordination_delayed: copy.impactCoordinationDelayed,
    attention_fragmented: copy.impactAttentionFragmented,
    needed_item_unavailable: copy.impactNeededItemUnavailable,
    shared_space_obstructed: copy.impactSharedSpaceObstructed,
    false_stock_signal: copy.impactFalseStockSignal,
    planning_stalled: copy.impactPlanningStalled,
    participants_waiting: copy.impactParticipantsWaiting,
    arrangements_disrupted: copy.impactArrangementsDisrupted,
    irritation_only: copy.impactIrritation,
    "": "—",
  }[value];
}

function mitigationLabel(
  value: FilingDraft["mitigation"],
  copy: FilingCopy,
): string {
  return {
    brings_dessert: copy.mitigationDessert,
    apologizes: copy.mitigationApology,
    helps_others: copy.mitigationHelp,
    useful_warning: copy.mitigationWarning,
    provides_summary: copy.mitigationProvidesSummary,
    acknowledges_delay: copy.mitigationAcknowledgesDelay,
    usually_clear: copy.mitigationUsuallyClear,
    helps_coordinate: copy.mitigationHelpsCoordinate,
    usually_restocks: copy.mitigationUsuallyRestocks,
    corrects_when_asked: copy.mitigationCorrectsWhenAsked,
    handles_other_chores: copy.mitigationHandlesOtherChores,
    usually_orderly: copy.mitigationUsuallyOrderly,
    offers_alternatives_sometimes: copy.mitigationOffersAlternativesSometimes,
    confirms_when_prompted: copy.mitigationConfirmsWhenPrompted,
    gave_some_notice: copy.mitigationGaveSomeNotice,
    usually_flexible: copy.mitigationUsuallyFlexible,
    "": "—",
  }[value];
}

function evidenceSummary(draft: FilingDraft, copy: FilingCopy): string {
  if (draft.department === "digital_conduct") {
    if (draft.offence === "fragmented_messages") {
      return format(copy.summaryFragmentedMessages, {
        messages: draft.facts.fragmentedMessages.messageCount || "—",
        ideas: draft.facts.fragmentedMessages.ideaCount || "—",
        minutes: draft.facts.fragmentedMessages.burstMinutes || "—",
      });
    }
    if (draft.offence === "excessive_voice_note") {
      return format(copy.summaryExcessiveVoiceNote, {
        minutes: draft.facts.excessiveVoiceNote.durationMinutes || "—",
        ideas: draft.facts.excessiveVoiceNote.ideaCount || "—",
      });
    }
    if (draft.offence === "unacknowledged_coordination") {
      return format(copy.summaryUnacknowledgedCoordination, {
        hours: draft.facts.unacknowledgedCoordination.responseHours || "—",
        followUps: draft.facts.unacknowledgedCoordination.followUpCount || "—",
      });
    }
    return "—";
  }
  if (draft.department === "domestic_affairs") {
    if (draft.offence === "token_remainder") {
      return format(copy.summaryTokenRemainder, {
        remaining: draft.facts.tokenRemainder.remainingServings || "—",
        capacity: draft.facts.tokenRemainder.capacityServings || "—",
      });
    }
    if (draft.offence === "misplaced_object") {
      return format(copy.summaryMisplacedObject, {
        items: draft.facts.misplacedObject.itemCount || "—",
        steps: draft.facts.misplacedObject.distanceSteps || "—",
        seconds: draft.facts.misplacedObject.correctionSeconds || "—",
      });
    }
    if (draft.offence === "empty_packaging") {
      return format(copy.summaryEmptyPackaging, {
        packages: draft.facts.emptyPackaging.emptyPackageCount || "—",
        occurrences: draft.facts.emptyPackaging.recurrencesInThirtyDays || "—",
      });
    }
    return "—";
  }
  if (draft.department === "social_planning") {
    if (draft.offence === "option_veto_cycle") {
      return format(copy.summaryOptionVetoCycle, {
        proposed: draft.facts.optionVetoCycle.proposedOptionCount || "—",
        rejected: draft.facts.optionVetoCycle.rejectedOptionCount || "—",
        alternatives: draft.facts.optionVetoCycle.alternativeOptionCount || "—",
        alternativeUnit:
          draft.facts.optionVetoCycle.alternativeOptionCount === "1"
            ? copy.alternativeSingular
            : copy.alternativesPlural,
      });
    }
    if (draft.offence === "decision_drift") {
      return format(copy.summaryDecisionDrift, {
        rounds: draft.facts.decisionDrift.decisionRoundCount || "—",
        hours: draft.facts.decisionDrift.elapsedHours || "—",
        hourUnit:
          draft.facts.decisionDrift.elapsedHours === "1"
            ? copy.hourSingular
            : copy.hoursSuffix,
        participants: draft.facts.decisionDrift.participantCount || "—",
      });
    }
    if (draft.offence === "confirmed_plan_revision") {
      return format(copy.summaryConfirmedPlanRevision, {
        revisions: draft.facts.confirmedPlanRevision.revisionCount || "—",
        revisionUnit:
          draft.facts.confirmedPlanRevision.revisionCount === "1"
            ? copy.revisionSingular
            : copy.revisionsSuffix,
        participants: draft.facts.confirmedPlanRevision.participantCount || "—",
        hours: draft.facts.confirmedPlanRevision.noticeHours || "—",
        hourUnit:
          draft.facts.confirmedPlanRevision.noticeHours === "1"
            ? copy.hourSingular
            : copy.hoursSuffix,
      });
    }
    return "—";
  }
  if (draft.offence === "premature_departure") {
    return format(copy.summaryPremature, {
      time: draft.facts.prematureDeparture.declaredTime || "—",
      delay: draft.facts.prematureDeparture.delayMinutes || "—",
    });
  }
  if (draft.offence === "chronic_lateness") {
    return format(copy.summaryLate, {
      time: draft.facts.chronicLateness.agreedTime || "—",
      delay: draft.facts.chronicLateness.delayMinutes || "—",
    });
  }
  if (draft.offence === "optimistic_estimate") {
    return format(copy.summaryEstimate, {
      estimate: draft.facts.optimisticEstimate.estimatedMinutes || "—",
      actual: draft.facts.optimisticEstimate.actualMinutes || "—",
    });
  }
  return "—";
}
