import { describe, expect, it } from "vitest";

import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";

const common = {
  locale: "en" as const,
  department: "domestic_affairs" as const,
  respondent: "Sam",
  relationship: "roommate" as const,
  impact: "irritation_only" as const,
  mitigation: "handles_other_chores" as const,
  statement: "One small remainder was left in the shared container.",
};

function remainder(
  remainingServings: number,
  capacityServings: number,
): DomesticAffairsFiling {
  return {
    ...common,
    offence: "token_remainder",
    facts: { remainingServings, capacityServings },
  };
}

describe("Domestic Affairs deterministic assessment", () => {
  it("uses explicit remainder boundaries", () => {
    expect(assessDomesticAffairsFiling(remainder(4, 20)).severity.base).toBe(
      "limited",
    );
    expect(assessDomesticAffairsFiling(remainder(3, 20)).severity.base).toBe(
      "established",
    );
    expect(assessDomesticAffairsFiling(remainder(1, 20)).severity.base).toBe(
      "material",
    );
  });

  it.each([
    [{ itemCount: 2, distanceSteps: 7, correctionSeconds: 29 }, "limited"],
    [{ itemCount: 3, distanceSteps: 7, correctionSeconds: 29 }, "established"],
    [{ itemCount: 6, distanceSteps: 7, correctionSeconds: 29 }, "material"],
  ] as const)("assesses correction path %o as %s", (facts, severity) => {
    expect(
      assessDomesticAffairsFiling({
        ...common,
        offence: "misplaced_object",
        facts,
      }).severity.base,
    ).toBe(severity);
  });

  it.each([
    [{ emptyPackageCount: 1, recurrencesInThirtyDays: 3 }, "limited"],
    [{ emptyPackageCount: 2, recurrencesInThirtyDays: 4 }, "established"],
    [{ emptyPackageCount: 5, recurrencesInThirtyDays: 8 }, "material"],
  ] as const)("assesses empty inventory %o as %s", (facts, severity) => {
    expect(
      assessDomesticAffairsFiling({
        ...common,
        offence: "empty_packaging",
        facts,
      }).severity.base,
    ).toBe(severity);
  });

  it("applies consequence once and retains mitigation and household prohibitions", () => {
    const assessment = assessDomesticAffairsFiling({
      ...remainder(3, 20),
      impact: "needed_item_unavailable",
    });
    expect(assessment.severity).toEqual({
      base: "established",
      assessed: "material",
      consequenceAdjustment: 1,
    });
    expect(assessment.acceptedFactors.mitigation).toMatchObject({
      role: "mitigating",
      remedyEffect: "caps_at_three_occasions",
    });
    expect(assessment.remedyConstraints).toMatchObject({
      family: "container_completion_protocol",
      binding: "non_binding",
      maximumOccasions: 3,
    });
    expect(assessment.remedyConstraints.prohibited).toEqual(
      expect.arrayContaining([
        "household_surveillance",
        "hygiene_enforcement",
        "food_restriction",
        "property_disposal",
        "financial_penalty",
      ]),
    );
  });

  it("keeps presentation stable when private filing content changes", () => {
    const baseline = remainder(1, 12);
    const changed: DomesticAffairsFiling = {
      ...baseline,
      respondent: "A different alias",
      relationship: "sibling",
      statement: "Different bounded witness language.",
    };
    expect(assessDomesticAffairsFiling(changed).presentation).toEqual(
      assessDomesticAffairsFiling(baseline).presentation,
    );
  });
});
