import { describe, expect, it } from "vitest";

import {
  createEmptySocialPlanningDraft,
  type SocialPlanningDraft,
  validateSocialPlanningDraft,
  validateSocialPlanningFiling,
} from "@/domain/filing/social-planning";

function completeDraft(
  offence: SocialPlanningDraft["offence"] = "option_veto_cycle",
): SocialPlanningDraft {
  return {
    ...createEmptySocialPlanningDraft(),
    respondent: "Sam",
    relationship: "friend",
    offence,
    facts: {
      optionVetoCycle: {
        proposedOptionCount: "6",
        rejectedOptionCount: "5",
        alternativeOptionCount: "1",
      },
      decisionDrift: {
        decisionRoundCount: "5",
        elapsedHours: "72",
        participantCount: "4",
      },
      confirmedPlanRevision: {
        revisionCount: "2",
        participantCount: "5",
        noticeHours: "8",
      },
    },
    impact: "participants_waiting",
    mitigation: "usually_flexible",
    statement: "Six dinner options became one more request for suggestions.",
  };
}

describe("Social Planning filing domain", () => {
  it.each([
    "option_veto_cycle",
    "decision_drift",
    "confirmed_plan_revision",
  ] as const)(
    "normalizes the %s facts and validates its server boundary",
    (offence) => {
      const result = validateSocialPlanningDraft(completeDraft(offence), "en");
      expect(result).toMatchObject({
        status: "valid",
        filing: { locale: "en", department: "social_planning", offence },
      });
      if (result.status === "valid")
        expect(validateSocialPlanningFiling(result.filing, "en")).toEqual(
          result,
        );
    },
  );

  it("does not allow more rejections than submitted options", () => {
    const draft = completeDraft();
    draft.facts.optionVetoCycle = {
      proposedOptionCount: "4",
      rejectedOptionCount: "5",
      alternativeOptionCount: "0",
    };
    expect(validateSocialPlanningDraft(draft, "en")).toMatchObject({
      status: "invalid",
      errors: [{ field: "social_evidence", code: "rejections_exceed_options" }],
    });
  });

  it("rejects out-of-range planning evidence", () => {
    const draft = completeDraft("decision_drift");
    draft.facts.decisionDrift.elapsedHours = "337";
    expect(validateSocialPlanningDraft(draft, "en")).toMatchObject({
      status: "invalid",
      errors: [{ field: "social_evidence", code: "invalid_duration" }],
    });
  });

  it("retains the shared serious-content and locale boundaries", () => {
    const draft = completeDraft();
    draft.statement = "They made a threat about attending the event.";
    expect(validateSocialPlanningDraft(draft, "en").status).toBe("invalid");
    expect(validateSocialPlanningDraft(completeDraft(), "ja").status).toBe(
      "invalid",
    );
  });
});
