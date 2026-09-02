import type { ReactNode } from "react";

import type { ChronologyDeterminationSnapshot } from "@/domain/determination/determination-experience";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { CivicSeal } from "../application-shell/application-shell";

type DeterminationCopy = MessageCatalog["Determination"];
type NavigationCopy = MessageCatalog["Navigation"];

interface DeterminationRecordProps {
  snapshot: ChronologyDeterminationSnapshot;
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

            <p className="eyebrow">{copy.department}</p>
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

          <ChronologyReconstruction
            snapshot={snapshot}
            copy={copy}
            locale={locale}
          />

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
              <span>{copy.remedyMark}</span>
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
