import Image from "next/image";
import type { ReactNode } from "react";

import remedyStamp from "@/app/stamp.png";
import type {
  ChronologyDeterminationSnapshot,
  DeterminationSnapshot,
  DigitalConductDeterminationSnapshot,
  DomesticAffairsDeterminationSnapshot,
  SocialPlanningDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { CivicSeal } from "../application-shell/application-shell";

type DeterminationCopy = MessageCatalog["Determination"];
type NavigationCopy = MessageCatalog["Navigation"];

interface DeterminationRecordProps {
  snapshot: DeterminationSnapshot;
  locale: InterfaceLocale;
  copy: DeterminationCopy;
  navigation: NavigationCopy;
  sessionLabel: string;
  boundaryTitle: string;
  boundaryBody: string;
  actions: ReactNode;
  afterRecord?: ReactNode;
  publicMetadata?: {
    publishedAt: string;
    expiresAt: string;
    publishedLabel: string;
    expiresLabel: string;
  };
}

export function DeterminationRecord({
  snapshot,
  locale,
  copy,
  navigation,
  sessionLabel,
  boundaryTitle,
  boundaryBody,
  actions,
  afterRecord,
  publicMetadata,
}: DeterminationRecordProps) {
  const digitalConduct = isDigitalConductSnapshot(snapshot);
  const domesticAffairs = isDomesticAffairsSnapshot(snapshot);
  const socialPlanning = isSocialPlanningSnapshot(snapshot);
  const issuedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
  }).format(new Date(snapshot.issuedAt));

  return (
    <div
      className="determination-shell"
      data-locale={locale}
      data-variant={snapshot.presentationVariant}
    >
      <a className="skip-link" href="#determination-record">
        {copy.skipToContent}
      </a>
      <header className="determination-site-header">
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
        <span className="determination-session-label">{sessionLabel}</span>
      </header>

      <main className="determination-main" id="determination-record">
        <article className="determination-record">
          <header className="determination-masthead">
            <div className="determination-metadata">
              <div>
                <span>{copy.referenceLabel}</span>
                <strong>{snapshot.reference}</strong>
              </div>
              <div>
                <span>{copy.issuedLabel}</span>
                <strong>{issuedDate}</strong>
              </div>
              {publicMetadata ? (
                <>
                  <div>
                    <span>{publicMetadata.publishedLabel}</span>
                    <strong>
                      {formatDate(publicMetadata.publishedAt, locale)}
                    </strong>
                  </div>
                  <div>
                    <span>{publicMetadata.expiresLabel}</span>
                    <strong>
                      {formatDate(publicMetadata.expiresAt, locale)}
                    </strong>
                  </div>
                </>
              ) : null}
            </div>

            <div className="determination-seal" aria-hidden="true">
              <CivicSeal initial={navigation.brandInitial} />
              <div className="determination-signature">
                {[0, 1, 2, 3].map((bar) => (
                  <i key={bar} />
                ))}
              </div>
            </div>

            <p className="eyebrow">
              {digitalConduct
                ? copy.digitalDepartment
                : domesticAffairs
                  ? copy.domesticDepartment
                  : socialPlanning
                    ? copy.socialDepartment
                    : copy.department}
            </p>
            <h1>
              {format(copy.title, { respondent: snapshot.filing.respondent })}
            </h1>
            <span className="determination-disposition">
              {copy.disposition}
            </span>
            <p className="determination-allegation">
              {snapshot.language.allegation.text}
            </p>
          </header>

          {digitalConduct ? (
            <DigitalConductReconstruction
              snapshot={snapshot}
              copy={copy}
              locale={locale}
            />
          ) : domesticAffairs ? (
            <DomesticAffairsReconstruction
              snapshot={snapshot}
              copy={copy}
              locale={locale}
            />
          ) : socialPlanning ? (
            <SocialPlanningReconstruction
              snapshot={snapshot}
              copy={copy}
              locale={locale}
            />
          ) : (
            <ChronologyReconstruction
              snapshot={snapshot}
              copy={copy}
              locale={locale}
            />
          )}

          <section
            className="determination-findings"
            aria-labelledby="findings-title"
          >
            <div className="determination-section-heading">
              <p className="eyebrow">{copy.findingsKicker}</p>
              <h2 id="findings-title">{copy.findingsTitle}</h2>
            </div>
            <div className="finding-grid">
              <Finding
                index={copy.findingIndex}
                title={copy.findingLabel}
                text={snapshot.language.finding.text}
              />
              <Finding
                index={copy.consequenceIndex}
                title={copy.consequenceLabel}
                text={snapshot.language.consequence.text}
              />
              <Finding
                index={copy.mitigationIndex}
                title={copy.mitigationLabel}
                text={snapshot.language.mitigation.text}
              />
            </div>
          </section>

          <section className="witness-record" aria-labelledby="witness-title">
            <p className="eyebrow">{copy.witnessKicker}</p>
            <h2 id="witness-title">{copy.witnessTitle}</h2>
            <blockquote>{snapshot.filing.statement}</blockquote>
            <p>{copy.witnessBoundary}</p>
          </section>

          <section className="remedy-record" aria-labelledby="remedy-title">
            <div className="remedy-seal" aria-hidden="true">
              <Image
                className="remedy-stamp"
                src={remedyStamp}
                alt=""
                width={96}
                height={96}
                sizes="96px"
              />
            </div>
            <div>
              <p className="eyebrow">{copy.remedyKicker}</p>
              <h2 id="remedy-title">{snapshot.language.remedy.title}</h2>
              <p>{snapshot.language.remedy.instruction.text}</p>
              <span className="remedy-boundary">{copy.remedyBoundary}</span>
            </div>
          </section>

          <footer className="determination-closing">
            <p>{snapshot.language.closing}</p>
            <div className="determination-boundary">
              <strong>{boundaryTitle}</strong>
              <p>{boundaryBody}</p>
            </div>
            <div className="determination-actions">{actions}</div>
          </footer>
        </article>
        {afterRecord}
      </main>
    </div>
  );
}

function isDigitalConductSnapshot(
  snapshot: DeterminationSnapshot,
): snapshot is DigitalConductDeterminationSnapshot {
  return snapshot.filing.department === "digital_conduct";
}

function isDomesticAffairsSnapshot(
  snapshot: DeterminationSnapshot,
): snapshot is DomesticAffairsDeterminationSnapshot {
  return snapshot.filing.department === "domestic_affairs";
}

function isSocialPlanningSnapshot(
  snapshot: DeterminationSnapshot,
): snapshot is SocialPlanningDeterminationSnapshot {
  return snapshot.filing.department === "social_planning";
}

function ChronologyReconstruction({
  snapshot,
  copy,
  locale,
}: {
  snapshot: ChronologyDeterminationSnapshot;
  copy: DeterminationCopy;
  locale: InterfaceLocale;
}) {
  const number = new Intl.NumberFormat(locale);
  const minutes = snapshot.assessment.discrepancy.minutes;
  const markerPosition = `${String(
    snapshot.assessment.presentation.markerPositionBasisPoints / 100,
  )}%`;

  let firstLabel: string;
  let firstValue: string;
  let secondLabel: string;
  let secondValue: string;
  if (snapshot.filing.offence === "premature_departure") {
    firstLabel = copy.declarationLabel;
    firstValue = formatTime(snapshot.filing.facts.declaredTime, locale);
    secondLabel = copy.readinessLabel;
    secondValue = format(copy.minutesLater, {
      minutes: number.format(minutes),
    });
  } else if (snapshot.filing.offence === "chronic_lateness") {
    firstLabel = copy.agreementLabel;
    firstValue = formatTime(snapshot.filing.facts.agreedTime, locale);
    secondLabel = copy.arrivalLabel;
    secondValue = format(copy.minutesLate, { minutes: number.format(minutes) });
  } else {
    firstLabel = copy.estimateLabel;
    firstValue = format(copy.minutesValue, {
      minutes: number.format(snapshot.filing.facts.estimatedMinutes),
    });
    secondLabel = copy.actualLabel;
    secondValue = format(copy.minutesValue, {
      minutes: number.format(snapshot.filing.facts.actualMinutes),
    });
  }

  return (
    <section
      className="chronology-reconstruction"
      aria-labelledby="chronology-title"
    >
      <div className="determination-section-heading">
        <p className="eyebrow">{copy.chronologyKicker}</p>
        <h2 id="chronology-title">{copy.chronologyTitle}</h2>
        <p>{copy.chronologyBody}</p>
      </div>
      <figure className="chronology-figure">
        <div className="chronology-scale" aria-hidden="true">
          <span className="chronology-origin" />
          <span className="chronology-marker" style={{ left: markerPosition }}>
            <i />
          </span>
        </div>
        <figcaption>
          <div>
            <span>{firstLabel}</span>
            <strong>{firstValue}</strong>
          </div>
          <div>
            <span>{secondLabel}</span>
            <strong>{secondValue}</strong>
          </div>
          <div>
            <span>{copy.discrepancyLabel}</span>
            <strong>
              {format(copy.minutesValue, { minutes: number.format(minutes) })}
            </strong>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}

function DigitalConductReconstruction({
  snapshot,
  copy,
  locale,
}: {
  snapshot: DigitalConductDeterminationSnapshot;
  copy: DeterminationCopy;
  locale: InterfaceLocale;
}) {
  const number = new Intl.NumberFormat(locale);
  const evidence = snapshot.assessment.evidence;
  const displayedItems = Math.min(
    12,
    snapshot.assessment.presentation.itemCount,
  );
  const marker = `${String(snapshot.assessment.presentation.markerPositionBasisPoints / 100)}%`;
  let primaryLabel: string;
  let primaryValue: string;
  let secondaryLabel: string;
  let secondaryValue: string;
  if (evidence.kind === "message_density") {
    primaryLabel = copy.digitalMessagesLabel;
    primaryValue = number.format(evidence.messageCount);
    secondaryLabel = copy.digitalIdeasLabel;
    secondaryValue = number.format(evidence.ideaCount);
  } else if (evidence.kind === "voice_note_duration") {
    primaryLabel = copy.digitalDurationLabel;
    primaryValue = format(copy.minutesValue, {
      minutes: number.format(evidence.durationMinutes),
    });
    secondaryLabel = copy.digitalIdeasLabel;
    secondaryValue = number.format(evidence.ideaCount);
  } else {
    primaryLabel = copy.digitalResponseLabel;
    primaryValue = format(copy.hoursValue, {
      hours: number.format(evidence.responseHours),
    });
    secondaryLabel = copy.digitalFollowUpsLabel;
    secondaryValue = number.format(evidence.followUpCount);
  }
  return (
    <section
      className="digital-reconstruction"
      aria-labelledby="digital-conduct-title"
    >
      <div className="determination-section-heading">
        <p className="eyebrow">{copy.chronologyKicker}</p>
        <h2 id="digital-conduct-title">{copy.digitalReconstructionTitle}</h2>
        <p>{copy.digitalReconstructionBody}</p>
      </div>
      <figure className="communications-docket">
        <div className="message-sequence" aria-hidden="true">
          {Array.from({ length: displayedItems }, (_, index) => (
            <i
              key={index}
              style={{
                width: `${String(34 + ((index * 17 + snapshot.presentationVariant * 9) % 58))}%`,
              }}
            />
          ))}
        </div>
        <div className="communications-interval" aria-hidden="true">
          <span style={{ left: marker }} />
        </div>
        <figcaption>
          <div>
            <span>{primaryLabel}</span>
            <strong>{primaryValue}</strong>
          </div>
          <div>
            <span>{secondaryLabel}</span>
            <strong>{secondaryValue}</strong>
          </div>
          <div>
            <span>{copy.digitalDocketLabel}</span>
            <strong>{copy.digitalDocketValue}</strong>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}

function DomesticAffairsReconstruction({
  snapshot,
  copy,
  locale,
}: {
  snapshot: DomesticAffairsDeterminationSnapshot;
  copy: DeterminationCopy;
  locale: InterfaceLocale;
}) {
  const number = new Intl.NumberFormat(locale);
  const evidence = snapshot.assessment.evidence;
  const primaryWidth = `${String(Math.max(4, snapshot.assessment.presentation.primaryBasisPoints / 100))}%`;
  const secondaryWidth = `${String(Math.max(4, snapshot.assessment.presentation.secondaryBasisPoints / 100))}%`;
  let primaryValue: string;
  let secondaryValue: string;
  if (evidence.kind === "container_remainder") {
    primaryValue = format(copy.servingsValue, {
      count: number.format(evidence.remainingServings),
    });
    secondaryValue = format(copy.servingsValue, {
      count: number.format(evidence.capacityServings),
    });
  } else if (evidence.kind === "correction_path") {
    primaryValue = format(copy.stepsValue, {
      count: number.format(evidence.distanceSteps),
    });
    secondaryValue = format(copy.secondsValue, {
      count: number.format(evidence.correctionSeconds),
    });
  } else {
    primaryValue = format(copy.packagesValue, {
      count: number.format(evidence.emptyPackageCount),
    });
    secondaryValue = format(copy.occurrencesValue, {
      count: number.format(evidence.recurrencesInThirtyDays),
    });
  }
  return (
    <section
      className="domestic-reconstruction"
      aria-labelledby="domestic-affairs-title"
    >
      <div className="determination-section-heading">
        <p className="eyebrow">{copy.chronologyKicker}</p>
        <h2 id="domestic-affairs-title">{copy.domesticReconstructionTitle}</h2>
        <p>{copy.domesticReconstructionBody}</p>
      </div>
      <figure className="domestic-register">
        <div className="domestic-register-diagram" aria-hidden="true">
          <div className="domestic-container-gauge">
            <i style={{ height: primaryWidth }} />
          </div>
          <div className="domestic-correction-path">
            <span />
            <i style={{ width: secondaryWidth }} />
            <span />
          </div>
          <div className="domestic-inventory">
            {Array.from(
              {
                length: Math.min(8, snapshot.assessment.presentation.itemCount),
              },
              (_, index) => (
                <i key={index} />
              ),
            )}
          </div>
        </div>
        <figcaption>
          <div>
            <span>{copy.domesticPrimaryLabel}</span>
            <strong>{primaryValue}</strong>
          </div>
          <div>
            <span>{copy.domesticSecondaryLabel}</span>
            <strong>{secondaryValue}</strong>
          </div>
          <div>
            <span>{copy.domesticSourceLabel}</span>
            <strong>{copy.domesticSourceValue}</strong>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}

function SocialPlanningReconstruction({
  snapshot,
  copy,
  locale,
}: {
  snapshot: SocialPlanningDeterminationSnapshot;
  copy: DeterminationCopy;
  locale: InterfaceLocale;
}) {
  const number = new Intl.NumberFormat(locale);
  const evidence = snapshot.assessment.evidence;
  const primaryWidth = `${String(Math.max(4, snapshot.assessment.presentation.primaryBasisPoints / 100))}%`;
  const secondaryWidth = `${String(Math.max(4, snapshot.assessment.presentation.secondaryBasisPoints / 100))}%`;
  let primaryValue: string;
  let secondaryValue: string;
  if (evidence.kind === "option_tree") {
    primaryValue = format(copy.socialOptionsValue, {
      rejected: number.format(evidence.rejectedOptionCount),
      proposed: number.format(evidence.proposedOptionCount),
    });
    secondaryValue = format(copy.socialAlternativesValue, {
      count: number.format(evidence.alternativeOptionCount),
      unit:
        evidence.alternativeOptionCount === 1
          ? copy.alternativeSingular
          : copy.alternativesPlural,
    });
  } else if (evidence.kind === "decision_history") {
    primaryValue = format(copy.socialRoundsValue, {
      count: number.format(evidence.decisionRoundCount),
    });
    secondaryValue = format(copy.socialHoursParticipantsValue, {
      hours: number.format(evidence.elapsedHours),
      hourUnit:
        evidence.elapsedHours === 1 ? copy.hourSingular : copy.hourPlural,
      participants: number.format(evidence.participantCount),
    });
  } else {
    primaryValue = format(copy.socialRevisionsValue, {
      count: number.format(evidence.revisionCount),
      unit:
        evidence.revisionCount === 1
          ? copy.revisionSingular
          : copy.revisionPlural,
    });
    secondaryValue = format(copy.socialNoticeParticipantsValue, {
      hours: number.format(evidence.noticeHours),
      noticeUnit:
        evidence.noticeHours === 1
          ? copy.hourPossessiveSingular
          : copy.hourPossessivePlural,
      participants: number.format(evidence.participantCount),
    });
  }
  return (
    <section
      className="social-reconstruction"
      aria-labelledby="social-planning-title"
    >
      <div className="determination-section-heading">
        <p className="eyebrow">{copy.chronologyKicker}</p>
        <h2 id="social-planning-title">{copy.socialReconstructionTitle}</h2>
        <p>{copy.socialReconstructionBody}</p>
      </div>
      <figure className="social-register">
        <div className="social-register-diagram" aria-hidden="true">
          <div className="social-option-tree">
            <span />
            {Array.from(
              {
                length: Math.min(8, snapshot.assessment.presentation.itemCount),
              },
              (_, index) => (
                <i key={index} data-resolved={index % 3 === 2} />
              ),
            )}
          </div>
          <div className="social-decision-scale">
            <i style={{ width: primaryWidth }} />
            <span style={{ left: secondaryWidth }} />
          </div>
        </div>
        <figcaption>
          <div>
            <span>{copy.socialPrimaryLabel}</span>
            <strong>{primaryValue}</strong>
          </div>
          <div>
            <span>{copy.socialSecondaryLabel}</span>
            <strong>{secondaryValue}</strong>
          </div>
          <div>
            <span>{copy.socialSourceLabel}</span>
            <strong>{copy.socialSourceValue}</strong>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}

function Finding({
  index,
  title,
  text,
}: {
  index: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span>{index}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function formatTime(value: string, locale: InterfaceLocale): string {
  const date = new Date(`1970-01-01T${value}:00Z`);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatDate(value: string, locale: InterfaceLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([^}]+)\}/gu, (match, name: string) =>
    String(values[name] ?? match),
  );
}
