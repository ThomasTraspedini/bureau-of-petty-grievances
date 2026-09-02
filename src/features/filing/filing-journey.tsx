"use client";

import { type SyntheticEvent, useEffect, useState, useTransition } from "react";

import { type ChronologyAssessment } from "@/domain/determination/chronology-assessment";
import {
  type ChronologyDraft,
  type FilingError,
  type FilingErrorCode,
  type FilingField,
  countCharacters,
  createEmptyChronologyDraft,
  validateChronologyDraft,
  validateDraftField,
} from "@/domain/filing/chronology";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { CivicSeal } from "../application-shell/application-shell";
import {
  FILING_COMPLETION_SESSION_KEY,
  FILING_DRAFT_STORAGE_KEY,
  isValidCompletion,
  parseStoredDraft,
  serializeCompletion,
  serializeDraft,
} from "./draft-storage";
import {
  FILING_STEP_CODES,
  type FilingStepCode,
  nextFilingStep,
  previousFilingStep,
} from "./filing-steps";

type FilingCopy = MessageCatalog["Filing"];
type NavigationCopy = MessageCatalog["Navigation"];

type CompleteFiling = (
  locale: string,
  draft: unknown,
) => Promise<
  | { status: "accepted"; assessment: ChronologyAssessment }
  | { status: "rejected"; errors: FilingError[] }
>;

interface FilingJourneyProps {
  locale: InterfaceLocale;
  step: FilingStepCode;
  returnToReview: boolean;
  copy: FilingCopy;
  navigation: NavigationCopy;
  completeFiling: CompleteFiling;
}

type RecoveryNotice = "restored" | "expired" | "invalid" | null;

const FIELD_STEPS: Record<FilingField, FilingStepCode> = {
  respondent: "respondent",
  relationship: "relationship",
  offence: "classification",
  chronology: "chronology",
  impact: "impact",
  mitigation: "mitigation",
  statement: "statement",
};

const STEP_FIELDS: Partial<Record<FilingStepCode, FilingField>> = {
  respondent: "respondent",
  relationship: "relationship",
  classification: "offence",
  chronology: "chronology",
  impact: "impact",
  mitigation: "mitigation",
  statement: "statement",
};

export function FilingJourney({
  locale,
  step,
  returnToReview,
  copy,
  navigation,
  completeFiling,
}: FilingJourneyProps) {
  const [draft, setDraft] = useState<ChronologyDraft>(
    createEmptyChronologyDraft,
  );
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<RecoveryNotice>(null);
  const [error, setError] = useState<FilingErrorCode | null>(null);
  const [serverError, setServerError] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [completionReady, setCompletionReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = parseStoredDraft(
        window.localStorage.getItem(FILING_DRAFT_STORAGE_KEY),
        Date.now(),
      );
      setDraft(stored.draft);
      setNotice(stored.status === "empty" ? null : stored.status);
      if (stored.status === "expired" || stored.status === "invalid") {
        window.localStorage.removeItem(FILING_DRAFT_STORAGE_KEY);
      }
      if (step === "complete") {
        const validCompletion = isValidCompletion(
          window.sessionStorage.getItem(FILING_COMPLETION_SESSION_KEY),
          Date.now(),
        );
        if (!validCompletion) {
          window.location.replace(`/${locale}/file/review`);
          return;
        }
        setCompletionReady(true);
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
  const questionIndex = FILING_STEP_CODES.indexOf(step) + 1;
  const showProgress = questionIndex >= 1 && questionIndex <= 7;

  function updateDraft(update: (current: ChronologyDraft) => ChronologyDraft) {
    window.sessionStorage.removeItem(FILING_COMPLETION_SESSION_KEY);
    setDraft(update);
    setError(null);
    setServerError(false);
  }

  function navigate(target: FilingStepCode) {
    window.location.assign(pathFor(target));
  }

  function handleContinue(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = STEP_FIELDS[step];
    if (field) {
      const issue = validateDraftField(field, draft);
      if (issue) {
        setError(issue);
        return;
      }
    }
    const next = nextFilingStep(step);
    if (returnToReview) {
      navigate("review");
    } else if (next) {
      navigate(next);
    }
  }

  function handleComplete() {
    const localResult = validateChronologyDraft(draft, locale);
    if (localResult.status === "invalid") {
      const first = localResult.errors[0];
      if (first) {
        setError(first.code);
        navigate(FIELD_STEPS[first.field]);
      }
      return;
    }

    startTransition(async () => {
      const result = await completeFiling(locale, draft);
      if (result.status === "accepted") {
        window.sessionStorage.setItem(
          FILING_COMPLETION_SESSION_KEY,
          serializeCompletion(Date.now()),
        );
        navigate("complete");
        return;
      }
      setServerError(true);
    });
  }

  function resetDraft() {
    window.localStorage.removeItem(FILING_DRAFT_STORAGE_KEY);
    window.sessionStorage.removeItem(FILING_COMPLETION_SESSION_KEY);
    setDraft(createEmptyChronologyDraft());
    setNotice(null);
    setError(null);
    setServerError(false);
    setResetArmed(false);
    navigate("respondent");
  }

  const previous = previousFilingStep(step);

  return (
    <div className="filing-shell" data-locale={locale}>
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
        <span className="filing-service-name">{copy.serviceName}</span>
      </header>

      <main className="filing-main" id="filing-question">
        <aside className="filing-rail" aria-label={copy.serviceName}>
          <p>{copy.department}</p>
          {showProgress ? (
            <>
              <span>
                {format(copy.progress, { current: questionIndex, total: 7 })}
              </span>
              <div className="progress-track" aria-hidden="true">
                <i style={{ width: `${String((questionIndex / 7) * 100)}%` }} />
              </div>
            </>
          ) : null}
          <small>{copy.draftStatus}</small>
        </aside>

        <section className="filing-card" aria-busy={!hydrated}>
          {notice ? <RecoveryBanner notice={notice} copy={copy} /> : null}
          {serverError ? (
            <p className="form-error form-error-wide" role="alert">
              {copy.errorServer}
            </p>
          ) : null}

          {step === "review" ? (
            <ReviewStep
              draft={draft}
              copy={copy}
              locale={locale}
              isPending={isPending || !hydrated}
              onComplete={handleComplete}
            />
          ) : step === "complete" && completionReady ? (
            <CompleteStep copy={copy} locale={locale} />
          ) : step === "complete" ? (
            <p className="question-intro" role="status">
              {copy.completing}
            </p>
          ) : (
            <form noValidate onSubmit={handleContinue}>
              <fieldset className="filing-fieldset" disabled={!hydrated}>
                <legend className="sr-only">{copy.serviceName}</legend>
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

          {step !== "complete" ? (
            <div className="draft-reset">
              {resetArmed ? (
                <div role="group" aria-label={copy.resetWarning}>
                  <p>{copy.resetWarning}</p>
                  <button
                    type="button"
                    disabled={!hydrated}
                    onClick={resetDraft}
                  >
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
          ) : null}
        </section>
      </main>
    </div>
  );
}

interface QuestionStepProps {
  step: FilingStepCode;
  draft: ChronologyDraft;
  copy: FilingCopy;
  error: FilingErrorCode | null;
  updateDraft: (update: (current: ChronologyDraft) => ChronologyDraft) => void;
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

  if (step === "classification") {
    return (
      <QuestionFrame
        kicker={copy.classificationKicker}
        title={copy.classificationTitle}
        body={copy.classificationBody}
        why={copy.classificationWhy}
        copy={copy}
      >
        <ChoiceGroup
          name="offence"
          selected={draft.offence}
          options={[
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
          ]}
          onSelect={(value) => {
            updateDraft((current) => ({
              ...current,
              offence:
                value === "premature_departure" ||
                value === "chronic_lateness" ||
                value === "optimistic_estimate"
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

  if (step === "chronology") {
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

  if (step === "impact") {
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
          options={[
            ["table_held", copy.impactTable],
            ["repeated_updates", copy.impactUpdates],
            ["plans_compressed", copy.impactCompressed],
            ["irritation_only", copy.impactIrritation],
          ]}
          onSelect={(value) => {
            updateDraft((current) => ({
              ...current,
              impact:
                value === "table_held" ||
                value === "repeated_updates" ||
                value === "plans_compressed" ||
                value === "irritation_only"
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

  if (step === "mitigation") {
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
          options={[
            ["brings_dessert", copy.mitigationDessert],
            ["apologizes", copy.mitigationApology],
            ["helps_others", copy.mitigationHelp],
            ["useful_warning", copy.mitigationWarning],
          ]}
          onSelect={(value) => {
            updateDraft((current) => ({
              ...current,
              mitigation:
                value === "brings_dessert" ||
                value === "apologizes" ||
                value === "helps_others" ||
                value === "useful_warning"
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
  updateDraft: (update: (current: ChronologyDraft) => ChronologyDraft) => void;
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
            updateDraft((current) => ({
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
            updateDraft((current) => ({
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
            updateDraft((current) => ({
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
            updateDraft((current) => ({
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
          updateDraft((current) => ({
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
          updateDraft((current) => ({
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
  draft: ChronologyDraft;
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
      copy.reviewClassification,
      offenceLabel(draft.offence, copy),
      "classification",
    ],
    [copy.reviewChronology, chronologySummary(draft, copy), "chronology"],
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
            <dd>{value}</dd>
            <a href={`/${locale}/file/${target}?return=review`}>
              {copy.correct}
            </a>
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

function CompleteStep({
  copy,
  locale,
}: {
  copy: FilingCopy;
  locale: InterfaceLocale;
}) {
  return (
    <div className="complete-panel">
      <span className="complete-mark" aria-hidden="true">
        ✓
      </span>
      <p className="eyebrow">{copy.completeKicker}</p>
      <h1>{copy.completeTitle}</h1>
      <p className="question-intro">{copy.completeBody}</p>
      <span className="complete-status">{copy.completeStatus}</span>
      <div className="filing-actions">
        <a className="button button-secondary" href={`/${locale}/file/review`}>
          {copy.completeReturn}
        </a>
        <a className="button button-primary" href={`/${locale}`}>
          {copy.completeHome}
        </a>
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
    statement_too_long: copy.errorStatementTooLong,
    restricted_content: copy.errorRestricted,
    invalid_selection: copy.errorInvalidSelection,
  };
  return values[error];
}

function relationshipLabel(
  value: ChronologyDraft["relationship"],
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

function offenceLabel(
  value: ChronologyDraft["offence"],
  copy: FilingCopy,
): string {
  return {
    premature_departure: copy.offencePremature,
    chronic_lateness: copy.offenceLate,
    optimistic_estimate: copy.offenceEstimate,
    "": "—",
  }[value];
}

function impactLabel(
  value: ChronologyDraft["impact"],
  copy: FilingCopy,
): string {
  return {
    table_held: copy.impactTable,
    repeated_updates: copy.impactUpdates,
    plans_compressed: copy.impactCompressed,
    irritation_only: copy.impactIrritation,
    "": "—",
  }[value];
}

function mitigationLabel(
  value: ChronologyDraft["mitigation"],
  copy: FilingCopy,
): string {
  return {
    brings_dessert: copy.mitigationDessert,
    apologizes: copy.mitigationApology,
    helps_others: copy.mitigationHelp,
    useful_warning: copy.mitigationWarning,
    "": "—",
  }[value];
}

function chronologySummary(draft: ChronologyDraft, copy: FilingCopy): string {
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
