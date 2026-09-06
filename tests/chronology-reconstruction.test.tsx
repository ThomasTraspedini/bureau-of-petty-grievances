import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { createRepresentativeDetermination } from "@/features/determination/example-determination";
import { DeterminationRecord } from "@/features/determination/determination-record";
import { getMessageCatalog } from "@/i18n/catalogs";

for (const locale of ["en", "it", "fr", "de", "es", "pt-BR"] as const) {
  describe(`chronology reconstruction (${locale})`, () => {
    for (const offence of [
      "premature_departure",
      "chronic_lateness",
      "optimistic_estimate",
    ] as const) {
      it(`represents ${offence} without a scaled third event`, () => {
        const catalog = getMessageCatalog(locale);
        const snapshot = createRepresentativeDetermination(
          catalog.Example,
          locale,
        );
        const filing =
          offence === "premature_departure"
            ? snapshot.filing
            : offence === "chronic_lateness"
              ? {
                  ...snapshot.filing,
                  offence,
                  facts: { agreedTime: "19:30", delayMinutes: 24 },
                }
              : {
                  ...snapshot.filing,
                  offence,
                  facts: { estimatedMinutes: 10, actualMinutes: 34 },
                };
        const { container } = render(
          <DeterminationRecord
            snapshot={{
              ...snapshot,
              filing,
              assessment: assessChronologyFiling(filing),
            }}
            locale={locale}
            copy={catalog.Determination}
            navigation={catalog.Navigation}
            sessionLabel=""
            boundaryTitle=""
            boundaryBody=""
            actions={null}
          />,
        );
        const section = container.querySelector(".chronology-reconstruction");
        expect(section).not.toBeNull();
        if (!section) throw new Error("Missing chronology");
        expect(section.querySelector("[style]")).toBeNull();
        expect(section.querySelector(".chronology-scale")).toBeNull();
        const terms = within(section as HTMLElement)
          .getAllByRole("term")
          .map((node) => node.textContent);
        if (offence === "optimistic_estimate") {
          expect(section.querySelector(".chronology-relationship")).toBeNull();
          expect(terms).toEqual([
            catalog.Determination.estimateLabel,
            catalog.Determination.actualLabel,
            catalog.Determination.overrunLabel,
          ]);
        } else {
          expect(
            section.querySelectorAll(
              ".chronology-relationship .chronology-endpoint",
            ),
          ).toHaveLength(2);
          expect(terms).toEqual([
            offence === "premature_departure"
              ? catalog.Determination.declarationLabel
              : catalog.Determination.agreementLabel,
            catalog.Determination.discrepancyLabel,
            offence === "premature_departure"
              ? catalog.Determination.readinessLabel
              : catalog.Determination.arrivalLabel,
          ]);
        }
      });
    }
  });
}
