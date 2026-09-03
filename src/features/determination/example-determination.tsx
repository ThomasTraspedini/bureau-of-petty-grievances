import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { createChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  determinationPresentationVariant,
  type ChronologyDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import { createItalianChronologyFallback } from "@/domain/determination/locales/it";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { DeterminationRecord } from "./determination-record";

type ExampleCopy = MessageCatalog["Example"];

interface ExampleDeterminationProps {
  locale: InterfaceLocale;
  copy: ExampleCopy;
  determination: MessageCatalog["Determination"];
  navigation: MessageCatalog["Navigation"];
}

const EXAMPLE_REFERENCE = "CHR · 2026 · 0427BP";
const EXAMPLE_ISSUED_AT = "2026-09-03T12:00:00.000Z";

export function createRepresentativeDetermination(
  copy: ExampleCopy,
  locale: InterfaceLocale = "en",
): ChronologyDeterminationSnapshot {
  const filing: ChronologyFiling = {
    locale,
    department: "chronology",
    respondent: copy.respondent,
    relationship: "friend",
    offence: "premature_departure",
    facts: { declaredTime: "19:30", delayMinutes: 24 },
    impact: "table_held",
    mitigation: "brings_dessert",
    statement: copy.statement,
  };
  const assessment = assessChronologyFiling(filing);
  const command = createChronologyDeterminationLanguageCommand(
    filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The representative determination is internally invalid.");
  }

  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: filing.locale,
    reference: EXAMPLE_REFERENCE,
    issuedAt: EXAMPLE_ISSUED_AT,
    assessment,
    language:
      locale === "it"
        ? createItalianChronologyFallback(command.command)
        : createEnglishChronologyFallback(command.command),
    filing,
    presentationVariant: determinationPresentationVariant(
      EXAMPLE_REFERENCE,
      assessment.presentation.visualSeed,
    ),
  };
}

export function ExampleDetermination({
  locale,
  copy,
  determination,
  navigation,
}: ExampleDeterminationProps) {
  const snapshot = createRepresentativeDetermination(copy, locale);

  return (
    <DeterminationRecord
      snapshot={snapshot}
      locale={locale}
      copy={determination}
      navigation={navigation}
      sessionLabel={copy.sessionLabel}
      boundaryTitle={copy.boundaryTitle}
      boundaryBody={copy.boundaryBody}
      actions={
        <>
          <a className="button button-secondary" href={`/${locale}`}>
            {copy.homeAction}
          </a>
          <a
            className="button button-primary"
            href={`/${locale}/file/respondent`}
          >
            {copy.filingAction}
          </a>
        </>
      }
    />
  );
}
