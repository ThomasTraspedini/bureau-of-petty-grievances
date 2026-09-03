"use client";

import {
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type { IssuedDetermination } from "@/domain/determination/determination-experience";
import {
  type ChronologyDraft,
  type FilingError,
  type FilingErrorCode,
  type FilingField,
  countCharacters,
  validateDraftField as validateChronologyDraftField,
} from "@/domain/filing/chronology";
import {
  type DigitalConductDraft,
  validateDigitalConductDraftField,
} from "@/domain/filing/digital-conduct";
import {
  type DomesticAffairsDraft,
  validateDomesticAffairsDraftField,
} from "@/domain/filing/domestic-affairs";
import {
  type SocialPlanningDraft,
  validateSocialPlanningDraftField,
} from "@/domain/filing/social-planning";
import {
  createEmptyFilingDraft,
  type Filing,
  type FilingDraft,
  switchDraftDepartment,
  validateFilingDraft,
} from "@/domain/filing/filing";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import type { AnalyticsPathCode } from "@/domain/observability/product-analytics";

import { CivicSeal } from "../application-shell/application-shell";
import {
  GENERATION_IDEMPOTENCY_STORAGE_KEY,
  getOrCreateGenerationIdempotencyKey,
} from "../access/generation-idempotency";
import {
  DETERMINATION_SESSION_KEY,
  LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
  LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
  LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
  serializeDeterminationSession,
} from "../determination/determination-session";
import {
  FILING_DRAFT_STORAGE_KEY,
  LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY,
  LEGACY_DOMESTIC_DRAFT_STORAGE_KEY,
  LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY,
  parseStoredDraft,
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

type FilingCopy = MessageCatalog["Filing"];
type NavigationCopy = MessageCatalog["Navigation"];

type CompleteFiling = (
  locale: string,
  draft: unknown,
  idempotencyKey: unknown,
  journeyId?: unknown,
) => Promise<
  | { status: "accepted"; determination: IssuedDetermination }
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

  useEffect(() => {
    stepStartedAt.current = Date.now();
    const timer = window.setTimeout(() => {
      const stored = parseStoredDraft(
        window.localStorage.getItem(FILING_DRAFT_STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY) ??
          window.localStorage.getItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY),
        Date.now(),
      );
      setDraft(stored.draft);
      setNotice(stored.status === "empty" ? null : stored.status);
      if (stored.status === "expired" || stored.status === "invalid") {
        window.localStorage.removeItem(FILING_DRAFT_STORAGE_KEY);
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
  }, [locale, step]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      FILING_DRAFT_STORAGE_KEY,
      serializeDraft(draft, Date.now()),
    );
  }, [draft, hydrated]);

  const pathFor = (target: FilingStepCode) => `/${locale}/file/${target}`;
  const questionIndex = filingStepIndex(step, draft.department);
  const showProgress =
    questionIndex >= 1 && questionIndex <= FILING_QUESTION_COUNT;
  const observedPathCode = analyticsPathCode(draft);

  function updateDraft(update: (current: FilingDraft) => FilingDraft) {
    window.sessionStorage.removeItem(DETERMINATION_SESSION_KEY);
    window.sessionStorage.removeItem(LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY);
    window.sessionStorage.removeItem(
      LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(
      LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(GENERATION_IDEMPOTENCY_STORAGE_KEY);
    setDraft(update);
    setError(null);
    setServerError(false);
    setGenerationFailed(false);
    setGenerationLimited(null);
  }

  function navigate(target: FilingStepCode) {
    window.location.assign(pathFor(target));
  }

  function handleContinue(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = STEP_FIELDS[step];
    if (field) {
      const issue = validateActiveDraftField(field, draft);
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
        );
        const journeyId = currentAnalyticsJourneyId();
        const result = journeyId
          ? await completeFiling(locale, draft, idempotencyKey, journeyId)
          : await completeFiling(locale, draft, idempotencyKey);
        if (result.status === "accepted") {
          window.sessionStorage.removeItem(GENERATION_IDEMPOTENCY_STORAGE_KEY);
          window.sessionStorage.setItem(
            DETERMINATION_SESSION_KEY,
            serializeDeterminationSession(
              draft,
              result.determination,
              Date.now(),
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
    window.localStorage.removeItem(FILING_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_DOMESTIC_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(DETERMINATION_SESSION_KEY);
    window.sessionStorage.removeItem(LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY);
    window.sessionStorage.removeItem(
      LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(
      LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
    );
    window.sessionStorage.removeItem(GENERATION_IDEMPOTENCY_STORAGE_KEY);
    setDraft(createEmptyFilingDraft());
    setNotice(null);
    setError(null);
    setServerError(false);
    setResetArmed(false);
    navigate("respondent");
  }

  const previous = previousFilingStep(step, draft.department);
  const serviceName =
    draft.department === "chronology"
      ? copy.serviceName
      : draft.department === "digital_conduct"
        ? copy.digitalServiceName
        : draft.department === "domestic_affairs"
          ? copy.domesticServiceName
          : copy.socialServiceName;

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
          <p>
            {draft.department === "chronology"
              ? copy.department
              : draft.department === "digital_conduct"
                ? copy.digitalDepartment
                : draft.department === "domestic_affairs"
                  ? copy.domesticDepartment
                  : copy.socialDepartment}
          </p>
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
              />
            )
          ) : (
            <form noValidate onSubmit={handleContinue}>
              <fieldset className="filing-fieldset" disabled={!hydrated}>
                <legend className="sr-only">{serviceName}</legend>
                <QuestionStep
                  step={step}
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
                    <a className="text-action" href={pathFor("review")}>
                      <span aria-hidden="true">←</span> {copy.back}
                    </a>
                  ) : previous ? (
                    <a className="text-action" href={pathFor(previous)}>
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
): FilingErrorCode | null {
  if (draft.department === "chronology")
    return validateChronologyDraftField(field, draft);
  if (draft.department === "digital_conduct")
    return validateDigitalConductDraftField(field, draft);
  return draft.department === "domestic_affairs"
    ? validateDomesticAffairsDraftField(field, draft)
    : validateSocialPlanningDraftField(field, draft);
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

interface QuestionStepProps {
  step: FilingStepCode;
  draft: FilingDraft;
  copy: FilingCopy;
  error: FilingErrorCode | null;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}

function QuestionStep({
  step,
  draft,
  copy,
  error,
  updateDraft,
  goToClassification,
}: QuestionStepProps) {
  const errorMessage = error ? errorCopy(error, copy) : null;
  const errorId = errorMessage ? `${step}-error` : undefined;

  if (step === "respondent") {
    return (
      <QuestionFrame
        kicker={copy.respondentKicker}
        title={copy.respondentTitle}
        body={copy.respondentBody}
        why={copy.respondentWhy}
        copy={copy}
      >
        <label className="field-label" htmlFor="respondent">
          {copy.respondentLabel}
        </label>
        <input
          autoFocus
          className="text-input"
          id="respondent"
          maxLength={32}
          value={draft.respondent}
          aria-describedby={`respondent-hint${errorId ? ` ${errorId}` : ""}`}
          aria-invalid={Boolean(errorMessage)}
          onChange={(event) => {
            updateDraft((current) => ({
              ...current,
              respondent: event.target.value,
            }));
          }}
        />
        <span className="field-hint" id="respondent-hint">
          {copy.respondentHint}
        </span>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  if (step === "relationship") {
    return (
      <QuestionFrame
        kicker={copy.relationshipKicker}
        title={format(copy.relationshipTitle, {
          respondent:
            draft.respondent || copy.reviewRespondent.toLocaleLowerCase("en"),
        })}
        body={copy.relationshipBody}
        why={copy.relationshipWhy}
        copy={copy}
      >
        <ChoiceGroup
          name="relationship"
          selected={draft.relationship}
          options={[
            ["friend", copy.relationshipFriend],
            ["partner", copy.relationshipPartner],
            ["roommate", copy.relationshipRoommate],
            ["colleague", copy.relationshipColleague],
            ["sibling", copy.relationshipSibling],
          ]}
          onSelect={(value) => {
            updateDraft((current) => ({
              ...current,
              relationship:
                value === "friend" ||
                value === "partner" ||
                value === "roommate" ||
                value === "colleague" ||
                value === "sibling"
                  ? value
                  : "",
            }));
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  if (step === "department") {
    return (
      <QuestionFrame
        kicker={copy.departmentKicker}
        title={copy.departmentTitle}
        body={copy.departmentBody}
        why={copy.departmentWhy}
        copy={copy}
      >
        <ChoiceGroup
          name="department"
          selected={draft.department}
          options={[
            [
              "chronology",
              copy.departmentChronology,
              copy.departmentChronologyDescription,
            ],
            [
              "digital_conduct",
              copy.departmentDigitalConduct,
              copy.departmentDigitalConductDescription,
            ],
            [
              "domestic_affairs",
              copy.departmentDomesticAffairs,
              copy.departmentDomesticAffairsDescription,
            ],
            [
              "social_planning",
              copy.departmentSocialPlanning,
              copy.departmentSocialPlanningDescription,
            ],
          ]}
          onSelect={(value) => {
            if (
              value !== "chronology" &&
              value !== "digital_conduct" &&
              value !== "domestic_affairs" &&
              value !== "social_planning"
            )
              return;
            updateDraft((current) => switchDraftDepartment(current, value));
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  if (step === "classification") {
    const options =
      draft.department === "chronology"
        ? ([
            [
              "premature_departure",
              copy.offencePremature,
              copy.offencePrematureDescription,
            ],
            ["chronic_lateness", copy.offenceLate, copy.offenceLateDescription],
            [
              "optimistic_estimate",
              copy.offenceEstimate,
              copy.offenceEstimateDescription,
            ],
          ] as const)
        : draft.department === "digital_conduct"
          ? ([
              [
                "fragmented_messages",
                copy.offenceFragmentedMessages,
                copy.offenceFragmentedMessagesDescription,
              ],
              [
                "excessive_voice_note",
                copy.offenceExcessiveVoiceNote,
                copy.offenceExcessiveVoiceNoteDescription,
              ],
              [
                "unacknowledged_coordination",
                copy.offenceUnacknowledgedCoordination,
                copy.offenceUnacknowledgedCoordinationDescription,
              ],
            ] as const)
          : draft.department === "domestic_affairs"
            ? ([
                [
                  "token_remainder",
                  copy.offenceTokenRemainder,
                  copy.offenceTokenRemainderDescription,
                ],
                [
                  "misplaced_object",
                  copy.offenceMisplacedObject,
                  copy.offenceMisplacedObjectDescription,
                ],
                [
                  "empty_packaging",
                  copy.offenceEmptyPackaging,
                  copy.offenceEmptyPackagingDescription,
                ],
              ] as const)
            : ([
                [
                  "option_veto_cycle",
                  copy.offenceOptionVetoCycle,
                  copy.offenceOptionVetoCycleDescription,
                ],
                [
                  "decision_drift",
                  copy.offenceDecisionDrift,
                  copy.offenceDecisionDriftDescription,
                ],
                [
                  "confirmed_plan_revision",
                  copy.offenceConfirmedPlanRevision,
                  copy.offenceConfirmedPlanRevisionDescription,
                ],
              ] as const);
    return (
      <QuestionFrame
        kicker={copy.classificationKicker}
        title={
          draft.department === "chronology"
            ? copy.classificationTitle
            : draft.department === "digital_conduct"
              ? copy.digitalClassificationTitle
              : draft.department === "domestic_affairs"
                ? copy.domesticClassificationTitle
                : copy.socialClassificationTitle
        }
        body={
          draft.department === "chronology"
            ? copy.classificationBody
            : draft.department === "digital_conduct"
              ? copy.digitalClassificationBody
              : draft.department === "domestic_affairs"
                ? copy.domesticClassificationBody
                : copy.socialClassificationBody
        }
        why={copy.classificationWhy}
        copy={copy}
      >
        <ChoiceGroup
          name="offence"
          selected={draft.offence}
          options={options}
          onSelect={(value) => {
            updateDraft((current) => {
              if (current.department === "chronology") {
                return {
                  ...current,
                  offence:
                    value === "premature_departure" ||
                    value === "chronic_lateness" ||
                    value === "optimistic_estimate"
                      ? value
                      : "",
                };
              }
              if (current.department === "digital_conduct") {
                return {
                  ...current,
                  offence:
                    value === "fragmented_messages" ||
                    value === "excessive_voice_note" ||
                    value === "unacknowledged_coordination"
                      ? value
                      : "",
                };
              }
              if (current.department === "domestic_affairs") {
                return {
                  ...current,
                  offence:
                    value === "token_remainder" ||
                    value === "misplaced_object" ||
                    value === "empty_packaging"
                      ? value
                      : "",
                };
              }
              return {
                ...current,
                offence:
                  value === "option_veto_cycle" ||
                  value === "decision_drift" ||
                  value === "confirmed_plan_revision"
                    ? value
                    : "",
              };
            });
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  if (step === "chronology") {
    if (draft.department !== "chronology") {
      return (
        <DepartmentEvidenceMismatch
          copy={copy}
          goToClassification={goToClassification}
        />
      );
    }
    return (
      <ChronologyQuestion
        draft={draft}
        copy={copy}
        errorMessage={errorMessage}
        errorId={errorId}
        updateDraft={updateDraft}
        goToClassification={goToClassification}
      />
    );
  }

  if (step === "communications") {
    if (draft.department !== "digital_conduct") {
      return (
        <DepartmentEvidenceMismatch
          copy={copy}
          goToClassification={goToClassification}
        />
      );
    }
    return (
      <DigitalConductQuestion
        draft={draft}
        copy={copy}
        errorMessage={errorMessage}
        errorId={errorId}
        updateDraft={updateDraft}
        goToClassification={goToClassification}
      />
    );
  }

  if (step === "domestic_evidence") {
    if (draft.department !== "domestic_affairs") {
      return (
        <DepartmentEvidenceMismatch
          copy={copy}
          goToClassification={goToClassification}
        />
      );
    }
    return (
      <DomesticAffairsQuestion
        draft={draft}
        copy={copy}
        errorMessage={errorMessage}
        errorId={errorId}
        updateDraft={updateDraft}
        goToClassification={goToClassification}
      />
    );
  }

  if (step === "social_evidence") {
    if (draft.department !== "social_planning") {
      return (
        <DepartmentEvidenceMismatch
          copy={copy}
          goToClassification={goToClassification}
        />
      );
    }
    return (
      <SocialPlanningQuestion
        draft={draft}
        copy={copy}
        errorMessage={errorMessage}
        errorId={errorId}
        updateDraft={updateDraft}
        goToClassification={goToClassification}
      />
    );
  }

  if (step === "impact") {
    const options =
      draft.department === "chronology"
        ? ([
            ["table_held", copy.impactTable],
            ["repeated_updates", copy.impactUpdates],
            ["plans_compressed", copy.impactCompressed],
            ["irritation_only", copy.impactIrritation],
          ] as const)
        : draft.department === "digital_conduct"
          ? ([
              ["notification_burden", copy.impactNotificationBurden],
              ["coordination_delayed", copy.impactCoordinationDelayed],
              ["attention_fragmented", copy.impactAttentionFragmented],
              ["irritation_only", copy.impactIrritation],
            ] as const)
          : draft.department === "domestic_affairs"
            ? ([
                ["needed_item_unavailable", copy.impactNeededItemUnavailable],
                ["shared_space_obstructed", copy.impactSharedSpaceObstructed],
                ["false_stock_signal", copy.impactFalseStockSignal],
                ["irritation_only", copy.impactIrritation],
              ] as const)
            : ([
                ["planning_stalled", copy.impactPlanningStalled],
                ["participants_waiting", copy.impactParticipantsWaiting],
                ["arrangements_disrupted", copy.impactArrangementsDisrupted],
                ["irritation_only", copy.impactIrritation],
              ] as const);
    return (
      <QuestionFrame
        kicker={copy.impactKicker}
        title={copy.impactTitle}
        body={copy.impactBody}
        why={copy.impactWhy}
        copy={copy}
      >
        <ChoiceGroup
          name="impact"
          selected={draft.impact}
          options={options}
          onSelect={(value) => {
            updateDraft((current) => {
              if (current.department === "chronology") {
                return {
                  ...current,
                  impact:
                    value === "table_held" ||
                    value === "repeated_updates" ||
                    value === "plans_compressed" ||
                    value === "irritation_only"
                      ? value
                      : "",
                };
              }
              if (current.department === "digital_conduct") {
                return {
                  ...current,
                  impact:
                    value === "notification_burden" ||
                    value === "coordination_delayed" ||
                    value === "attention_fragmented" ||
                    value === "irritation_only"
                      ? value
                      : "",
                };
              }
              if (current.department === "domestic_affairs") {
                return {
                  ...current,
                  impact:
                    value === "needed_item_unavailable" ||
                    value === "shared_space_obstructed" ||
                    value === "false_stock_signal" ||
                    value === "irritation_only"
                      ? value
                      : "",
                };
              }
              return {
                ...current,
                impact:
                  value === "planning_stalled" ||
                  value === "participants_waiting" ||
                  value === "arrangements_disrupted" ||
                  value === "irritation_only"
                    ? value
                    : "",
              };
            });
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  if (step === "mitigation") {
    const options =
      draft.department === "chronology"
        ? ([
            ["brings_dessert", copy.mitigationDessert],
            ["apologizes", copy.mitigationApology],
            ["helps_others", copy.mitigationHelp],
            ["useful_warning", copy.mitigationWarning],
          ] as const)
        : draft.department === "digital_conduct"
          ? ([
              ["provides_summary", copy.mitigationProvidesSummary],
              ["acknowledges_delay", copy.mitigationAcknowledgesDelay],
              ["usually_clear", copy.mitigationUsuallyClear],
              ["helps_coordinate", copy.mitigationHelpsCoordinate],
            ] as const)
          : draft.department === "domestic_affairs"
            ? ([
                ["usually_restocks", copy.mitigationUsuallyRestocks],
                ["corrects_when_asked", copy.mitigationCorrectsWhenAsked],
                ["handles_other_chores", copy.mitigationHandlesOtherChores],
                ["usually_orderly", copy.mitigationUsuallyOrderly],
              ] as const)
            : ([
                [
                  "offers_alternatives_sometimes",
                  copy.mitigationOffersAlternativesSometimes,
                ],
                ["confirms_when_prompted", copy.mitigationConfirmsWhenPrompted],
                ["gave_some_notice", copy.mitigationGaveSomeNotice],
                ["usually_flexible", copy.mitigationUsuallyFlexible],
              ] as const);
    return (
      <QuestionFrame
        kicker={copy.mitigationKicker}
        title={format(copy.mitigationTitle, {
          respondent:
            draft.respondent || copy.reviewRespondent.toLocaleLowerCase("en"),
        })}
        body={copy.mitigationBody}
        why={copy.mitigationWhy}
        copy={copy}
      >
        <ChoiceGroup
          name="mitigation"
          selected={draft.mitigation}
          options={options}
          onSelect={(value) => {
            updateDraft((current) => {
              if (current.department === "chronology") {
                return {
                  ...current,
                  mitigation:
                    value === "brings_dessert" ||
                    value === "apologizes" ||
                    value === "helps_others" ||
                    value === "useful_warning"
                      ? value
                      : "",
                };
              }
              if (current.department === "digital_conduct") {
                return {
                  ...current,
                  mitigation:
                    value === "provides_summary" ||
                    value === "acknowledges_delay" ||
                    value === "usually_clear" ||
                    value === "helps_coordinate"
                      ? value
                      : "",
                };
              }
              if (current.department === "domestic_affairs") {
                return {
                  ...current,
                  mitigation:
                    value === "usually_restocks" ||
                    value === "corrects_when_asked" ||
                    value === "handles_other_chores" ||
                    value === "usually_orderly"
                      ? value
                      : "",
                };
              }
              return {
                ...current,
                mitigation:
                  value === "offers_alternatives_sometimes" ||
                  value === "confirms_when_prompted" ||
                  value === "gave_some_notice" ||
                  value === "usually_flexible"
                    ? value
                    : "",
              };
            });
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  return (
    <QuestionFrame
      kicker={copy.statementKicker}
      title={copy.statementTitle}
      body={copy.statementBody}
      why={copy.statementWhy}
      copy={copy}
    >
      <label className="field-label" htmlFor="statement">
        {copy.statementLabel}
      </label>
      <textarea
        autoFocus
        className="text-area"
        id="statement"
        maxLength={160}
        value={draft.statement}
        aria-describedby={`statement-counter statement-boundary${errorId ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(errorMessage)}
        onChange={(event) => {
          updateDraft((current) => ({
            ...current,
            statement: event.target.value,
          }));
        }}
      />
      <div className="statement-meta">
        <span id="statement-counter">
          {format(copy.statementCounter, {
            count: countCharacters(draft.statement, "en"),
          })}
        </span>
        <span id="statement-boundary">{copy.statementBoundary}</span>
      </div>
      {errorMessage ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </QuestionFrame>
  );
}

interface ChronologyQuestionProps {
  draft: ChronologyDraft;
  copy: FilingCopy;
  errorMessage: string | null;
  errorId: string | undefined;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}

function ChronologyQuestion({
  draft,
  copy,
  errorMessage,
  errorId,
  updateDraft,
  goToClassification,
}: ChronologyQuestionProps) {
  const updateChronology = (
    update: (current: ChronologyDraft) => ChronologyDraft,
  ) => {
    updateDraft((current) =>
      current.department === "chronology" ? update(current) : current,
    );
  };
  if (!draft.offence) {
    return (
      <QuestionFrame
        kicker={copy.chronologyKicker}
        title={copy.classificationTitle}
        body={copy.classificationBody}
        why={copy.chronologyWhy}
        copy={copy}
      >
        <button
          className="button button-secondary"
          type="button"
          onClick={goToClassification}
        >
          {copy.back}
        </button>
      </QuestionFrame>
    );
  }

  const shared = {
    kicker: copy.chronologyKicker,
    why: copy.chronologyWhy,
    copy,
  };

  if (draft.offence === "premature_departure") {
    const facts = draft.facts.prematureDeparture;
    return (
      <QuestionFrame
        {...shared}
        title={copy.chronologyPrematureTitle}
        body={copy.chronologyPrematureBody}
      >
        <TimingFields
          firstLabel={copy.declaredTimeLabel}
          firstType="time"
          firstValue={facts.declaredTime}
          secondLabel={copy.delayLabel}
          secondValue={facts.delayMinutes}
          suffix={copy.minutesSuffix}
          errorId={errorId}
          onFirst={(value) => {
            updateChronology((current) => ({
              ...current,
              facts: {
                ...current.facts,
                prematureDeparture: {
                  ...current.facts.prematureDeparture,
                  declaredTime: value,
                },
              },
            }));
          }}
          onSecond={(value) => {
            updateChronology((current) => ({
              ...current,
              facts: {
                ...current.facts,
                prematureDeparture: {
                  ...current.facts.prematureDeparture,
                  delayMinutes: value,
                },
              },
            }));
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  if (draft.offence === "chronic_lateness") {
    const facts = draft.facts.chronicLateness;
    return (
      <QuestionFrame
        {...shared}
        title={copy.chronologyLateTitle}
        body={copy.chronologyLateBody}
      >
        <TimingFields
          firstLabel={copy.agreedTimeLabel}
          firstType="time"
          firstValue={facts.agreedTime}
          secondLabel={copy.delayLabel}
          secondValue={facts.delayMinutes}
          suffix={copy.minutesSuffix}
          errorId={errorId}
          onFirst={(value) => {
            updateChronology((current) => ({
              ...current,
              facts: {
                ...current.facts,
                chronicLateness: {
                  ...current.facts.chronicLateness,
                  agreedTime: value,
                },
              },
            }));
          }}
          onSecond={(value) => {
            updateChronology((current) => ({
              ...current,
              facts: {
                ...current.facts,
                chronicLateness: {
                  ...current.facts.chronicLateness,
                  delayMinutes: value,
                },
              },
            }));
          }}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }

  const facts = draft.facts.optimisticEstimate;
  return (
    <QuestionFrame
      {...shared}
      title={copy.chronologyEstimateTitle}
      body={copy.chronologyEstimateBody}
    >
      <TimingFields
        firstLabel={copy.estimatedMinutesLabel}
        firstType="number"
        firstValue={facts.estimatedMinutes}
        secondLabel={copy.actualMinutesLabel}
        secondValue={facts.actualMinutes}
        suffix={copy.minutesSuffix}
        errorId={errorId}
        onFirst={(value) => {
          updateChronology((current) => ({
            ...current,
            facts: {
              ...current.facts,
              optimisticEstimate: {
                ...current.facts.optimisticEstimate,
                estimatedMinutes: value,
              },
            },
          }));
        }}
        onSecond={(value) => {
          updateChronology((current) => ({
            ...current,
            facts: {
              ...current.facts,
              optimisticEstimate: {
                ...current.facts.optimisticEstimate,
                actualMinutes: value,
              },
            },
          }));
        }}
      />
      {errorMessage ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </QuestionFrame>
  );
}

function DepartmentEvidenceMismatch({
  copy,
  goToClassification,
}: {
  copy: FilingCopy;
  goToClassification: () => void;
}) {
  return (
    <QuestionFrame
      kicker={copy.classificationKicker}
      title={copy.classificationTitle}
      body={copy.classificationBody}
      why={copy.classificationWhy}
      copy={copy}
    >
      <button
        className="button button-secondary"
        type="button"
        onClick={goToClassification}
      >
        {copy.back}
      </button>
    </QuestionFrame>
  );
}

function DigitalConductQuestion({
  draft,
  copy,
  errorMessage,
  errorId,
  updateDraft,
  goToClassification,
}: {
  draft: DigitalConductDraft;
  copy: FilingCopy;
  errorMessage: string | null;
  errorId: string | undefined;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}) {
  if (!draft.offence) {
    return (
      <DepartmentEvidenceMismatch
        copy={copy}
        goToClassification={goToClassification}
      />
    );
  }
  const updateDigital = (
    update: (current: DigitalConductDraft) => DigitalConductDraft,
  ) => {
    updateDraft((current) =>
      current.department === "digital_conduct" ? update(current) : current,
    );
  };
  const shared = {
    kicker: copy.communicationsKicker,
    why: copy.communicationsWhy,
    copy,
  };
  if (draft.offence === "fragmented_messages") {
    const facts = draft.facts.fragmentedMessages;
    return (
      <QuestionFrame
        {...shared}
        title={copy.fragmentedMessagesTitle}
        body={copy.fragmentedMessagesBody}
      >
        <EvidenceNumberGrid
          fields={[
            [
              copy.messageCountLabel,
              facts.messageCount,
              2,
              40,
              copy.messagesSuffix,
              (value) => {
                updateDigital((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    fragmentedMessages: {
                      ...current.facts.fragmentedMessages,
                      messageCount: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.ideaCountLabel,
              facts.ideaCount,
              1,
              10,
              copy.ideasSuffix,
              (value) => {
                updateDigital((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    fragmentedMessages: {
                      ...current.facts.fragmentedMessages,
                      ideaCount: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.burstMinutesLabel,
              facts.burstMinutes,
              1,
              60,
              copy.minutesSuffix,
              (value) => {
                updateDigital((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    fragmentedMessages: {
                      ...current.facts.fragmentedMessages,
                      burstMinutes: value,
                    },
                  },
                }));
              },
            ],
          ]}
          errorId={errorId}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }
  if (draft.offence === "excessive_voice_note") {
    const facts = draft.facts.excessiveVoiceNote;
    return (
      <QuestionFrame
        {...shared}
        title={copy.excessiveVoiceNoteTitle}
        body={copy.excessiveVoiceNoteBody}
      >
        <EvidenceNumberGrid
          fields={[
            [
              copy.voiceDurationLabel,
              facts.durationMinutes,
              2,
              60,
              copy.minutesSuffix,
              (value) => {
                updateDigital((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    excessiveVoiceNote: {
                      ...current.facts.excessiveVoiceNote,
                      durationMinutes: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.ideaCountLabel,
              facts.ideaCount,
              1,
              10,
              copy.ideasSuffix,
              (value) => {
                updateDigital((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    excessiveVoiceNote: {
                      ...current.facts.excessiveVoiceNote,
                      ideaCount: value,
                    },
                  },
                }));
              },
            ],
          ]}
          errorId={errorId}
        />
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }
  const facts = draft.facts.unacknowledgedCoordination;
  return (
    <QuestionFrame
      {...shared}
      title={copy.unacknowledgedCoordinationTitle}
      body={copy.unacknowledgedCoordinationBody}
    >
      <EvidenceNumberGrid
        fields={[
          [
            copy.responseHoursLabel,
            facts.responseHours,
            1,
            168,
            copy.hoursSuffix,
            (value) => {
              updateDigital((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  unacknowledgedCoordination: {
                    ...current.facts.unacknowledgedCoordination,
                    responseHours: value,
                  },
                },
              }));
            },
          ],
          [
            copy.followUpCountLabel,
            facts.followUpCount,
            1,
            10,
            copy.messagesSuffix,
            (value) => {
              updateDigital((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  unacknowledgedCoordination: {
                    ...current.facts.unacknowledgedCoordination,
                    followUpCount: value,
                  },
                },
              }));
            },
          ],
        ]}
        errorId={errorId}
      />
      <p className="field-hint">{copy.coordinationBoundary}</p>
      {errorMessage ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </QuestionFrame>
  );
}

function DomesticAffairsQuestion({
  draft,
  copy,
  errorMessage,
  errorId,
  updateDraft,
  goToClassification,
}: {
  draft: DomesticAffairsDraft;
  copy: FilingCopy;
  errorMessage: string | null;
  errorId: string | undefined;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}) {
  if (!draft.offence) {
    return (
      <DepartmentEvidenceMismatch
        copy={copy}
        goToClassification={goToClassification}
      />
    );
  }
  const updateDomestic = (
    update: (current: DomesticAffairsDraft) => DomesticAffairsDraft,
  ) => {
    updateDraft((current) =>
      current.department === "domestic_affairs" ? update(current) : current,
    );
  };
  const shared = {
    kicker: copy.domesticEvidenceKicker,
    why: copy.domesticEvidenceWhy,
    copy,
  };
  if (draft.offence === "token_remainder") {
    const facts = draft.facts.tokenRemainder;
    return (
      <QuestionFrame
        {...shared}
        title={copy.tokenRemainderTitle}
        body={copy.tokenRemainderBody}
      >
        <EvidenceNumberGrid
          fields={[
            [
              copy.remainingServingsLabel,
              facts.remainingServings,
              1,
              5,
              copy.servingsSuffix,
              (value) => {
                updateDomestic((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    tokenRemainder: {
                      ...current.facts.tokenRemainder,
                      remainingServings: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.capacityServingsLabel,
              facts.capacityServings,
              2,
              24,
              copy.servingsSuffix,
              (value) => {
                updateDomestic((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    tokenRemainder: {
                      ...current.facts.tokenRemainder,
                      capacityServings: value,
                    },
                  },
                }));
              },
            ],
          ]}
          errorId={errorId}
        />
        <p className="field-hint">{copy.domesticBoundary}</p>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }
  if (draft.offence === "misplaced_object") {
    const facts = draft.facts.misplacedObject;
    return (
      <QuestionFrame
        {...shared}
        title={copy.misplacedObjectTitle}
        body={copy.misplacedObjectBody}
      >
        <EvidenceNumberGrid
          fields={[
            [
              copy.itemCountLabel,
              facts.itemCount,
              1,
              20,
              copy.itemsSuffix,
              (value) => {
                updateDomestic((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    misplacedObject: {
                      ...current.facts.misplacedObject,
                      itemCount: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.distanceStepsLabel,
              facts.distanceSteps,
              1,
              50,
              copy.stepsSuffix,
              (value) => {
                updateDomestic((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    misplacedObject: {
                      ...current.facts.misplacedObject,
                      distanceSteps: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.correctionSecondsLabel,
              facts.correctionSeconds,
              1,
              300,
              copy.secondsSuffix,
              (value) => {
                updateDomestic((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    misplacedObject: {
                      ...current.facts.misplacedObject,
                      correctionSeconds: value,
                    },
                  },
                }));
              },
            ],
          ]}
          errorId={errorId}
        />
        <p className="field-hint">{copy.domesticBoundary}</p>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }
  const facts = draft.facts.emptyPackaging;
  return (
    <QuestionFrame
      {...shared}
      title={copy.emptyPackagingTitle}
      body={copy.emptyPackagingBody}
    >
      <EvidenceNumberGrid
        fields={[
          [
            copy.emptyPackageCountLabel,
            facts.emptyPackageCount,
            1,
            10,
            copy.packagesSuffix,
            (value) => {
              updateDomestic((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  emptyPackaging: {
                    ...current.facts.emptyPackaging,
                    emptyPackageCount: value,
                  },
                },
              }));
            },
          ],
          [
            copy.recurrencesLabel,
            facts.recurrencesInThirtyDays,
            1,
            30,
            copy.occurrencesSuffix,
            (value) => {
              updateDomestic((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  emptyPackaging: {
                    ...current.facts.emptyPackaging,
                    recurrencesInThirtyDays: value,
                  },
                },
              }));
            },
          ],
        ]}
        errorId={errorId}
      />
      <p className="field-hint">{copy.domesticBoundary}</p>
      {errorMessage ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </QuestionFrame>
  );
}

function SocialPlanningQuestion({
  draft,
  copy,
  errorMessage,
  errorId,
  updateDraft,
  goToClassification,
}: {
  draft: SocialPlanningDraft;
  copy: FilingCopy;
  errorMessage: string | null;
  errorId: string | undefined;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}) {
  if (!draft.offence) {
    return (
      <DepartmentEvidenceMismatch
        copy={copy}
        goToClassification={goToClassification}
      />
    );
  }
  const updateSocial = (
    update: (current: SocialPlanningDraft) => SocialPlanningDraft,
  ) => {
    updateDraft((current) =>
      current.department === "social_planning" ? update(current) : current,
    );
  };
  const shared = {
    kicker: copy.socialEvidenceKicker,
    why: copy.socialEvidenceWhy,
    copy,
  };
  if (draft.offence === "option_veto_cycle") {
    const facts = draft.facts.optionVetoCycle;
    return (
      <QuestionFrame
        {...shared}
        title={copy.optionVetoCycleTitle}
        body={copy.optionVetoCycleBody}
      >
        <EvidenceNumberGrid
          fields={[
            [
              copy.proposedOptionCountLabel,
              facts.proposedOptionCount,
              2,
              20,
              copy.optionsSuffix,
              (value) => {
                updateSocial((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    optionVetoCycle: {
                      ...current.facts.optionVetoCycle,
                      proposedOptionCount: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.rejectedOptionCountLabel,
              facts.rejectedOptionCount,
              1,
              20,
              copy.optionsSuffix,
              (value) => {
                updateSocial((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    optionVetoCycle: {
                      ...current.facts.optionVetoCycle,
                      rejectedOptionCount: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.alternativeOptionCountLabel,
              facts.alternativeOptionCount,
              0,
              10,
              copy.optionsSuffix,
              (value) => {
                updateSocial((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    optionVetoCycle: {
                      ...current.facts.optionVetoCycle,
                      alternativeOptionCount: value,
                    },
                  },
                }));
              },
            ],
          ]}
          errorId={errorId}
        />
        <p className="field-hint">{copy.socialBoundary}</p>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }
  if (draft.offence === "decision_drift") {
    const facts = draft.facts.decisionDrift;
    return (
      <QuestionFrame
        {...shared}
        title={copy.decisionDriftTitle}
        body={copy.decisionDriftBody}
      >
        <EvidenceNumberGrid
          fields={[
            [
              copy.decisionRoundCountLabel,
              facts.decisionRoundCount,
              2,
              12,
              copy.roundsSuffix,
              (value) => {
                updateSocial((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    decisionDrift: {
                      ...current.facts.decisionDrift,
                      decisionRoundCount: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.elapsedHoursLabel,
              facts.elapsedHours,
              1,
              336,
              copy.hoursSuffix,
              (value) => {
                updateSocial((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    decisionDrift: {
                      ...current.facts.decisionDrift,
                      elapsedHours: value,
                    },
                  },
                }));
              },
            ],
            [
              copy.participantCountLabel,
              facts.participantCount,
              2,
              20,
              copy.participantsSuffix,
              (value) => {
                updateSocial((current) => ({
                  ...current,
                  facts: {
                    ...current.facts,
                    decisionDrift: {
                      ...current.facts.decisionDrift,
                      participantCount: value,
                    },
                  },
                }));
              },
            ],
          ]}
          errorId={errorId}
        />
        <p className="field-hint">{copy.socialBoundary}</p>
        {errorMessage ? (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        ) : null}
      </QuestionFrame>
    );
  }
  const facts = draft.facts.confirmedPlanRevision;
  return (
    <QuestionFrame
      {...shared}
      title={copy.confirmedPlanRevisionTitle}
      body={copy.confirmedPlanRevisionBody}
    >
      <EvidenceNumberGrid
        fields={[
          [
            copy.revisionCountLabel,
            facts.revisionCount,
            1,
            10,
            copy.revisionsSuffix,
            (value) => {
              updateSocial((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  confirmedPlanRevision: {
                    ...current.facts.confirmedPlanRevision,
                    revisionCount: value,
                  },
                },
              }));
            },
          ],
          [
            copy.participantCountLabel,
            facts.participantCount,
            2,
            20,
            copy.participantsSuffix,
            (value) => {
              updateSocial((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  confirmedPlanRevision: {
                    ...current.facts.confirmedPlanRevision,
                    participantCount: value,
                  },
                },
              }));
            },
          ],
          [
            copy.noticeHoursLabel,
            facts.noticeHours,
            0,
            168,
            copy.hoursSuffix,
            (value) => {
              updateSocial((current) => ({
                ...current,
                facts: {
                  ...current.facts,
                  confirmedPlanRevision: {
                    ...current.facts.confirmedPlanRevision,
                    noticeHours: value,
                  },
                },
              }));
            },
          ],
        ]}
        errorId={errorId}
      />
      <p className="field-hint">{copy.socialBoundary}</p>
      {errorMessage ? (
        <FieldError id={errorId}>{errorMessage}</FieldError>
      ) : null}
    </QuestionFrame>
  );
}

type EvidenceNumberField = readonly [
  label: string,
  value: string,
  minimum: number,
  maximum: number,
  suffix: string,
  onChange: (value: string) => void,
];

function EvidenceNumberGrid({
  fields,
  errorId,
}: {
  fields: readonly EvidenceNumberField[];
  errorId: string | undefined;
}) {
  return (
    <div className="timing-grid evidence-number-grid">
      {fields.map(
        ([label, value, minimum, maximum, suffix, onChange], index) => (
          <label key={label}>
            <span className="field-label">{label}</span>
            <span className="number-control">
              <input
                autoFocus={index === 0}
                className="text-input"
                type="number"
                inputMode="numeric"
                min={minimum}
                max={maximum}
                value={value}
                aria-describedby={errorId}
                onChange={(event) => {
                  onChange(event.target.value);
                }}
              />
              <span>{suffix}</span>
            </span>
          </label>
        ),
      )}
    </div>
  );
}

interface TimingFieldsProps {
  firstLabel: string;
  firstType: "time" | "number";
  firstValue: string;
  secondLabel: string;
  secondValue: string;
  suffix: string;
  errorId: string | undefined;
  onFirst: (value: string) => void;
  onSecond: (value: string) => void;
}

function TimingFields(props: TimingFieldsProps) {
  return (
    <div className="timing-grid">
      <label>
        <span className="field-label">{props.firstLabel}</span>
        <span className="number-control">
          <input
            autoFocus
            className="text-input"
            type={props.firstType}
            min={props.firstType === "number" ? 1 : undefined}
            max={props.firstType === "number" ? 180 : undefined}
            value={props.firstValue}
            aria-describedby={props.errorId}
            onChange={(event) => {
              props.onFirst(event.target.value);
            }}
          />
          {props.firstType === "number" ? <span>{props.suffix}</span> : null}
        </span>
      </label>
      <label>
        <span className="field-label">{props.secondLabel}</span>
        <span className="number-control">
          <input
            className="text-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={360}
            value={props.secondValue}
            aria-describedby={props.errorId}
            onChange={(event) => {
              props.onSecond(event.target.value);
            }}
          />
          <span>{props.suffix}</span>
        </span>
      </label>
    </div>
  );
}

interface QuestionFrameProps {
  kicker: string;
  title: string;
  body: string;
  why: string;
  copy: FilingCopy;
  children: React.ReactNode;
}

function QuestionFrame({
  kicker,
  title,
  body,
  why,
  copy,
  children,
}: QuestionFrameProps) {
  return (
    <>
      <p className="eyebrow">{kicker}</p>
      <h1>{title}</h1>
      <p className="question-intro">{body}</p>
      <div className="question-field">{children}</div>
      <details className="why-panel">
        <summary>{copy.whyLabel}</summary>
        <p>{why}</p>
      </details>
    </>
  );
}

interface ChoiceGroupProps {
  name: string;
  selected: string;
  options: readonly (readonly [string, string, string?])[];
  onSelect: (value: string) => void;
}

function ChoiceGroup({ name, selected, options, onSelect }: ChoiceGroupProps) {
  return (
    <fieldset className="choice-list">
      <legend className="sr-only">{name}</legend>
      {options.map(([value, label, description]) => (
        <label className="choice" key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={selected === value}
            onChange={() => {
              onSelect(value);
            }}
          />
          <span className="choice-indicator" aria-hidden="true" />
          <span>
            <strong>{label}</strong>
            {description ? <small>{description}</small> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

interface ReviewStepProps {
  draft: FilingDraft;
  copy: FilingCopy;
  locale: InterfaceLocale;
  isPending: boolean;
  onComplete: () => void;
}

function ReviewStep({
  draft,
  copy,
  locale,
  isPending,
  onComplete,
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
              <a href={`/${locale}/file/${target}?return=review`}>
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
        <a className="text-action" href={`/${locale}/file/statement`}>
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

function FieldError({
  id,
  children,
}: {
  id: string | undefined;
  children: string;
}) {
  return (
    <p className="form-error" id={id} role="alert">
      {children}
    </p>
  );
}

function errorCopy(error: FilingErrorCode, copy: FilingCopy): string {
  const values: Record<FilingErrorCode, string> = {
    required: copy.errorRequired,
    alias_too_long: copy.errorAliasTooLong,
    unnecessary_identifier: copy.errorIdentifier,
    invalid_time: copy.errorInvalidTime,
    invalid_duration: copy.errorInvalidDuration,
    estimate_not_exceeded: copy.errorEstimateNotExceeded,
    ratio_not_exceeded: copy.errorRatioNotExceeded,
    follow_up_required: copy.errorFollowUpRequired,
    remainder_not_smaller: copy.errorRemainderNotSmaller,
    rejections_exceed_options: copy.errorRejectionsExceedOptions,
    statement_too_long: copy.errorStatementTooLong,
    restricted_content: copy.errorRestricted,
    invalid_selection: copy.errorInvalidSelection,
  };
  return values[error];
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

function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([^}]+)\}/gu, (match, name: string) =>
    String(values[name] ?? match),
  );
}
