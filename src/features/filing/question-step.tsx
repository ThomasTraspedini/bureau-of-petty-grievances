import { useEffect, useRef } from "react";
import {
  countCharacters,
  type FilingErrorCode,
} from "@/domain/filing/chronology";
import {
  type FilingDraft,
  switchDraftDepartment,
} from "@/domain/filing/filing";
import type { InterfaceLocale } from "@/i18n/routing";
import type { FilingStepCode } from "./filing-steps";
import {
  ChronologyQuestion,
  DigitalConductQuestion,
  DomesticAffairsQuestion,
  SocialPlanningQuestion,
} from "./evidence-questions";
import {
  DepartmentEvidenceMismatch,
  QuestionFrame,
  ChoiceGroup,
  FieldError,
  format,
} from "./question-controls";
import type { MessageCatalog } from "@/i18n/catalogs";

type FilingCopy = MessageCatalog["Filing"];

interface QuestionStepProps {
  locale: InterfaceLocale;
  step: FilingStepCode;
  hydrated: boolean;
  draft: FilingDraft;
  copy: FilingCopy;
  error: FilingErrorCode | null;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}

export function QuestionStep({
  locale,
  step,
  hydrated,
  draft,
  copy,
  error,
  updateDraft,
  goToClassification,
}: QuestionStepProps) {
  const respondentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hydrated && step === "respondent") {
      respondentRef.current?.focus();
    }
  }, [hydrated, step]);

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
          ref={respondentRef}
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
            draft.respondent || copy.reviewRespondent.toLocaleLowerCase(locale),
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
            draft.respondent || copy.reviewRespondent.toLocaleLowerCase(locale),
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
            count: countCharacters(draft.statement, locale),
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
