import { describe, expect, it } from "vitest";

import {
  createEmptyDigitalConductDraft,
  type DigitalConductDraft,
  validateDigitalConductDraft,
  validateDigitalConductFiling,
} from "@/domain/filing/digital-conduct";

function completeDraft(
  offence: DigitalConductDraft["offence"] = "fragmented_messages",
): DigitalConductDraft {
  return {
    ...createEmptyDigitalConductDraft(),
    respondent: "Alex",
    relationship: "friend",
    offence,
    facts: {
      fragmentedMessages: {
        messageCount: "8",
        ideaCount: "2",
        burstMinutes: "6",
      },
      excessiveVoiceNote: { durationMinutes: "7", ideaCount: "2" },
      unacknowledgedCoordination: { responseHours: "18", followUpCount: "2" },
    },
    impact: "notification_burden",
    mitigation: "provides_summary",
    statement:
      "Eight alerts arrived before the complete dinner plan became clear.",
  };
}

describe("Digital Conduct filing domain", () => {
  it.each([
    "fragmented_messages",
    "excessive_voice_note",
    "unacknowledged_coordination",
  ] as const)("normalizes the %s evidence grammar", (offence) => {
    const result = validateDigitalConductDraft(completeDraft(offence), "en");
    expect(result).toMatchObject({
      status: "valid",
      filing: { locale: "en", department: "digital_conduct", offence },
    });
    if (result.status === "valid") {
      expect(validateDigitalConductFiling(result.filing, "en")).toEqual(result);
    }
  });

  it("requires actual fragmentation and at least one coordination follow-up", () => {
    const ratio = completeDraft();
    ratio.facts.fragmentedMessages = {
      messageCount: "2",
      ideaCount: "2",
      burstMinutes: "4",
    };
    expect(validateDigitalConductDraft(ratio, "en")).toMatchObject({
      status: "invalid",
      errors: [{ field: "communications", code: "ratio_not_exceeded" }],
    });

    const coordination = completeDraft("unacknowledged_coordination");
    coordination.facts.unacknowledgedCoordination.followUpCount = "0";
    expect(validateDigitalConductDraft(coordination, "en")).toMatchObject({
      status: "invalid",
      errors: [{ field: "communications", code: "follow_up_required" }],
    });
  });

  it("rejects serious matters and unsupported locales without losing typed boundaries", () => {
    const serious = completeDraft();
    serious.statement = "This describes stalking through message activity.";
    const result = validateDigitalConductDraft(serious, "en");
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors).toContainEqual({
        field: "statement",
        code: "restricted_content",
      });
    }
    expect(validateDigitalConductDraft(completeDraft(), "ja").status).toBe(
      "invalid",
    );
  });
});
