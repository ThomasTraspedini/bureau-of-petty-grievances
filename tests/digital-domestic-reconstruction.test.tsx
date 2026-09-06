import { readFileSync } from "node:fs";
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import {
  createDigitalConductDeterminationLanguageCommand,
  createDomesticAffairsDeterminationLanguageCommand,
} from "@/domain/determination/determination-language";
import { createEnglishDigitalConductFallback } from "@/domain/determination/locales/en-digital-conduct";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  type DeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import { DeterminationRecord } from "@/features/determination/determination-record";
import { getMessageCatalog } from "@/i18n/catalogs";

function snapshotFor(
  filing: DigitalConductFiling | DomesticAffairsFiling,
): DeterminationSnapshot {
  const base = {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: filing.locale,
    reference: "REG · 2026 · 0427BP",
    issuedAt: "2026-09-03T12:00:00.000Z",
    presentationVariant: 0 as const,
  };
  if (filing.department === "digital_conduct") {
    const assessment = assessDigitalConductFiling(filing);
    const command = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessment,
    );
    if (command.status !== "valid") throw new Error("Invalid fixture");
    return {
      ...base,
      filing,
      assessment,
      language: createEnglishDigitalConductFallback(command.command),
    };
  }
  const assessment = assessDomesticAffairsFiling(filing);
  const command = createDomesticAffairsDeterminationLanguageCommand(
    filing,
    assessment,
  );
  if (command.status !== "valid") throw new Error("Invalid fixture");
  return {
    ...base,
    filing,
    assessment,
    language: createEnglishDomesticAffairsFallback(command.command),
  };
}

function renderFacts(snapshot: DeterminationSnapshot) {
  const catalog = getMessageCatalog(snapshot.locale);
  const { container } = render(
    <DeterminationRecord
      snapshot={snapshot}
      locale={snapshot.locale}
      copy={catalog.Determination}
      navigation={catalog.Navigation}
      sessionLabel=""
      boundaryTitle=""
      boundaryBody=""
      actions={null}
    />,
  );
  const section = container.querySelector<HTMLElement>(
    ".digital-reconstruction, .domestic-reconstruction",
  );
  if (!section) throw new Error("Missing evidence");
  return section;
}

for (const locale of ["en", "it", "fr", "de", "es", "pt-BR"] as const) {
  describe(`digital and domestic evidence (${locale})`, () => {
    const copy = getMessageCatalog(locale).Determination;
    const number = new Intl.NumberFormat(locale);
    const common = {
      locale,
      respondent: "Sam",
      relationship: "friend" as const,
      impact: "irritation_only" as const,
      statement: "The submitted condition remained unresolved.",
    };
    const digital = {
      ...common,
      department: "digital_conduct" as const,
      mitigation: "usually_clear" as const,
    };
    const domestic = {
      ...common,
      department: "domestic_affairs" as const,
      mitigation: "usually_orderly" as const,
    };
    const unit = (template: string, value: number, key = "count") =>
      template.replace(`{${key}}`, number.format(value));
    const cases: {
      filing: DigitalConductFiling | DomesticAffairsFiling;
      facts: string[][];
    }[] = [
      {
        filing: {
          ...digital,
          offence: "fragmented_messages",
          facts: { messageCount: 40, ideaCount: 3, burstMinutes: 60 },
        },
        facts: [
          [copy.digitalMessagesLabel, number.format(40)],
          [copy.digitalIdeasLabel, number.format(3)],
          [copy.digitalBurstLabel, unit(copy.minutesValue, 60, "minutes")],
        ],
      },
      {
        filing: {
          ...digital,
          offence: "excessive_voice_note",
          facts: { durationMinutes: 60, ideaCount: 10 },
        },
        facts: [
          [copy.digitalDurationLabel, unit(copy.minutesValue, 60, "minutes")],
          [copy.digitalIdeasLabel, number.format(10)],
        ],
      },
      {
        filing: {
          ...digital,
          offence: "unacknowledged_coordination",
          facts: { responseHours: 168, followUpCount: 10 },
        },
        facts: [
          [copy.digitalResponseLabel, unit(copy.hoursValue, 168, "hours")],
          [copy.digitalFollowUpsLabel, number.format(10)],
        ],
      },
      {
        filing: {
          ...domestic,
          offence: "token_remainder",
          facts: { remainingServings: 1, capacityServings: 24 },
        },
        facts: [
          [copy.domesticRemainingLabel, unit(copy.servingValue, 1)],
          [copy.domesticCapacityLabel, unit(copy.servingsValue, 24)],
        ],
      },
      {
        filing: {
          ...domestic,
          offence: "misplaced_object",
          facts: { itemCount: 20, distanceSteps: 50, correctionSeconds: 300 },
        },
        facts: [
          [copy.domesticObjectsLabel, number.format(20)],
          [copy.domesticDistanceLabel, unit(copy.stepsValue, 50)],
          [copy.domesticCorrectionTimeLabel, unit(copy.secondsValue, 300)],
        ],
      },
      {
        filing: {
          ...domestic,
          offence: "empty_packaging",
          facts: { emptyPackageCount: 10, recurrencesInThirtyDays: 30 },
        },
        facts: [
          [copy.domesticEmptyPackagesLabel, unit(copy.packagesValue, 10)],
          [copy.domesticRecurrenceLabel, unit(copy.occurrencesValue, 30)],
        ],
      },
    ];
    for (const { filing, facts } of cases) {
      it(`shows every labeled fact and its source for ${filing.offence}`, () => {
        const snapshot = snapshotFor(filing);
        const section = renderFacts(snapshot);
        const expected = [
          ...facts,
          filing.department === "digital_conduct"
            ? [copy.digitalDocketLabel, copy.digitalDocketValue]
            : [copy.domesticSourceLabel, copy.domesticSourceValue],
        ];
        expect(
          within(section)
            .getAllByRole("term")
            .map((node) => node.textContent),
        ).toEqual(expected.map(([label]) => label));
        expect(
          within(section)
            .getAllByRole("definition")
            .map((node) => node.textContent),
        ).toEqual(expected.map(([, value]) => value));
        expect(
          section.querySelector(
            ".message-sequence, .communications-interval, .domestic-correction-path, .domestic-inventory",
          ),
        ).toBeNull();
        const fills = section.querySelectorAll<HTMLElement>("[style]");
        expect(fills).toHaveLength(
          filing.offence === "token_remainder" ? 1 : 0,
        );
        if (filing.offence === "token_remainder")
          expect(parseFloat(fills[0]?.style.height ?? "")).toBeCloseTo(
            100 / 24,
            10,
          );
      });
    }
    it.each([0, 1])(
      "keeps a remainder of %s readable without a minimum fill",
      (remainingServings) => {
        const snapshot = snapshotFor({
          ...domestic,
          offence: "token_remainder",
          facts: { remainingServings: 1, capacityServings: 24 },
        });
        if (
          !("evidence" in snapshot.assessment) ||
          snapshot.assessment.evidence.kind !== "container_remainder"
        )
          throw new Error("Wrong fixture");
        // Exercise rendering at zero independently of the current intake minimum.
        snapshot.assessment.evidence.remainingServings = remainingServings;
        const section = renderFacts(snapshot);
        expect(
          parseFloat(
            section.querySelector<HTMLElement>(".domestic-container-gauge i")
              ?.style.height ?? "",
          ),
        ).toBeCloseTo((remainingServings / 24) * 100, 10);
        expect(within(section).getAllByRole("definition")[0]).toHaveTextContent(
          unit(
            new Intl.PluralRules(locale).select(remainingServings) === "one"
              ? copy.servingValue
              : copy.servingsValue,
            remainingServings,
          ),
        );
      },
    );
  });
}

it("does not exaggerate small container fills through CSS", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const fill = /\.domestic-container-gauge i \{([^}]+)\}/.exec(css)?.[1];
  expect(fill).toBeDefined();
  expect(fill).not.toMatch(/min-height/);
});
