import type { ChronologyDraft } from "@/domain/filing/chronology";
import type { DigitalConductDraft } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsDraft } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningDraft } from "@/domain/filing/social-planning";
import type { FilingDraft } from "@/domain/filing/filing";
import {
  DepartmentEvidenceMismatch,
  EvidenceNumberGrid,
  TimingFields,
  QuestionFrame,
  FieldError,
} from "./question-controls";
import type { MessageCatalog } from "@/i18n/catalogs";

type FilingCopy = MessageCatalog["Filing"];

interface ChronologyQuestionProps {
  draft: ChronologyDraft;
  copy: FilingCopy;
  errorMessage: string | null;
  errorId: string | undefined;
  updateDraft: (update: (current: FilingDraft) => FilingDraft) => void;
  goToClassification: () => void;
}

export function ChronologyQuestion({
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

export function DigitalConductQuestion({
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
          rangeCopy={copy.numberRange}
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
          rangeCopy={copy.numberRange}
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
        rangeCopy={copy.numberRange}
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

export function DomesticAffairsQuestion({
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
          rangeCopy={copy.numberRange}
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
          rangeCopy={copy.numberRange}
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
        rangeCopy={copy.numberRange}
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

export function SocialPlanningQuestion({
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
          rangeCopy={copy.numberRange}
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
          rangeCopy={copy.numberRange}
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
        rangeCopy={copy.numberRange}
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
