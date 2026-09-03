import { describe, expect, it } from "vitest";

import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";

const common = {
  locale: "en" as const,
  department: "social_planning" as const,
  respondent: "Sam",
  relationship: "friend" as const,
  impact: "irritation_only" as const,
  mitigation: "usually_flexible" as const,
  statement: "The dinner shortlist returned for another round.",
};

function veto(
  proposedOptionCount: number,
  rejectedOptionCount: number,
  alternativeOptionCount: number,
): SocialPlanningFiling {
  return {
    ...common,
    offence: "option_veto_cycle",
    facts: {
      proposedOptionCount,
      rejectedOptionCount,
      alternativeOptionCount,
    },
  };
}

describe("Social Planning deterministic assessment", () => {
  it("uses explicit option-tree boundaries", () => {
    expect(assessSocialPlanningFiling(veto(5, 3, 1)).severity.base).toBe(
      "limited",
    );
    expect(assessSocialPlanningFiling(veto(5, 4, 1)).severity.base).toBe(
      "established",
    );
    expect(assessSocialPlanningFiling(veto(8, 8, 0)).severity.base).toBe(
      "material",
    );
  });

  it.each([
    [
      { decisionRoundCount: 3, elapsedHours: 24, participantCount: 3 },
      "limited",
    ],
    [
      { decisionRoundCount: 4, elapsedHours: 24, participantCount: 3 },
      "established",
    ],
    [
      { decisionRoundCount: 8, elapsedHours: 24, participantCount: 3 },
      "material",
    ],
  ] as const)("assesses decision history %o as %s", (facts, severity) => {
    expect(
      assessSocialPlanningFiling({
        ...common,
        offence: "decision_drift",
        facts,
      }).severity.base,
    ).toBe(severity);
  });

  it.each([
    [{ revisionCount: 1, participantCount: 3, noticeHours: 48 }, "limited"],
    [{ revisionCount: 2, participantCount: 3, noticeHours: 48 }, "established"],
    [{ revisionCount: 4, participantCount: 3, noticeHours: 48 }, "material"],
  ] as const)("assesses revision impact %o as %s", (facts, severity) => {
    expect(
      assessSocialPlanningFiling({
        ...common,
        offence: "confirmed_plan_revision",
        facts,
      }).severity.base,
    ).toBe(severity);
  });

  it("applies consequence once and retains mitigation and social prohibitions", () => {
    const assessment = assessSocialPlanningFiling({
      ...veto(5, 4, 1),
      impact: "planning_stalled",
    });
    expect(assessment.severity).toEqual({
      base: "established",
      assessed: "material",
      consequenceAdjustment: 1,
    });
    expect(assessment.remedyConstraints).toMatchObject({
      family: "bounded_shortlist_protocol",
      binding: "non_binding",
      maximumOccasions: 3,
    });
    expect(assessment.remedyConstraints.prohibited).toEqual(
      expect.arrayContaining([
        "social_surveillance",
        "compelled_attendance",
        "compelled_contact",
        "social_exclusion",
        "serious_matter_adjudication",
      ]),
    );
  });

  it("keeps presentation stable when private filing content changes", () => {
    const baseline = veto(6, 5, 1);
    const changed: SocialPlanningFiling = {
      ...baseline,
      respondent: "A different alias",
      relationship: "sibling",
      statement: "Different bounded witness language.",
    };
    expect(assessSocialPlanningFiling(changed).presentation).toEqual(
      assessSocialPlanningFiling(baseline).presentation,
    );
  });
});
