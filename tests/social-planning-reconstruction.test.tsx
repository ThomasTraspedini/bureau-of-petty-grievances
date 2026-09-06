import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import { createSocialPlanningDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishSocialPlanningFallback } from "@/domain/determination/locales/en-social-planning";
import { DETERMINATION_EXPERIENCE_VERSION } from "@/domain/determination/determination-experience";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
import { DeterminationRecord } from "@/features/determination/determination-record";
import { getMessageCatalog } from "@/i18n/catalogs";

for (const locale of ["en", "it", "fr", "de", "es", "pt-BR"] as const) {
  describe(`social planning facts (${locale})`, () => {
    for (const value of [0, 1, 24]) {
      const common = {
        locale,
        department: "social_planning" as const,
        respondent: "Sam",
        relationship: "friend" as const,
        impact: "irritation_only" as const,
        mitigation: "usually_flexible" as const,
        statement: "The dinner shortlist returned for another round.",
      };
      const filings: SocialPlanningFiling[] = [
        {
          ...common,
          offence: "option_veto_cycle",
          facts: {
            proposedOptionCount: 24,
            rejectedOptionCount: 1,
            alternativeOptionCount: value,
          },
        },
        {
          ...common,
          offence: "decision_drift",
          facts: {
            decisionRoundCount: 1,
            elapsedHours: value,
            participantCount: 2,
          },
        },
        {
          ...common,
          offence: "confirmed_plan_revision",
          facts: { revisionCount: 1, participantCount: 2, noticeHours: value },
        },
      ];
      for (const filing of filings) {
        it(`renders ${filing.offence} with exact facts including ${value}`, () => {
          const catalog = getMessageCatalog(locale);
          const copy = catalog.Determination;
          const assessment = assessSocialPlanningFiling(filing);
          const command = createSocialPlanningDeterminationLanguageCommand(
            filing,
            assessment,
          );
          if (command.status !== "valid") throw new Error("Invalid fixture");
          const { container } = render(
            <DeterminationRecord
              snapshot={{
                experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
                locale,
                reference: "SOC · 2026 · 0427BP",
                issuedAt: "2026-09-03T12:00:00.000Z",
                filing,
                assessment,
                language: createEnglishSocialPlanningFallback(command.command),
                presentationVariant: 0,
              }}
              locale={locale}
              copy={copy}
              navigation={catalog.Navigation}
              sessionLabel=""
              boundaryTitle=""
              boundaryBody=""
              actions={null}
            />,
          );
          const section = container.querySelector<HTMLElement>(
            ".social-reconstruction",
          );
          if (!section) throw new Error("Missing social evidence");
          const number = new Intl.NumberFormat(locale);
          const hours = new Intl.NumberFormat(locale, {
            style: "unit",
            unit: "hour",
            unitDisplay: "long",
          });
          const expected =
            filing.offence === "option_veto_cycle"
              ? [
                  [copy.socialProposedLabel, number.format(24)],
                  [copy.socialRejectedLabel, number.format(1)],
                  [copy.socialAlternativesLabel, number.format(value)],
                ]
              : filing.offence === "decision_drift"
                ? [
                    [copy.socialRoundsLabel, number.format(1)],
                    [copy.socialElapsedLabel, hours.format(value)],
                    [copy.socialParticipantsLabel, number.format(2)],
                  ]
                : [
                    [copy.socialRevisionsLabel, number.format(1)],
                    [copy.socialParticipantsLabel, number.format(2)],
                    [copy.socialNoticeLabel, hours.format(value)],
                  ];
          expected.push([copy.socialSourceLabel, copy.socialSourceValue]);
          expect(
            within(section)
              .getAllByRole("term")
              .map((node) => node.textContent),
          ).toEqual(expected.map(([label]) => label));
          expect(
            within(section)
              .getAllByRole("definition")
              .map((node) => node.textContent),
          ).toEqual(expected.map(([, fact]) => fact));
          expect(
            section.querySelector(
              "figure, [style], [aria-hidden], [data-resolved]",
            ),
          ).toBeNull();
        });
      }
    }
  });
}
