import { describe, expect, it } from "vitest";

import {
  type ChronologyDraft,
  containsRestrictedContent,
  createEmptyChronologyDraft,
  validateChronologyDraft,
  validateDraftField,
} from "@/domain/filing/chronology";

function completeDraft(): ChronologyDraft {
  return {
    ...createEmptyChronologyDraft(),
    respondent: "Marco",
    relationship: "friend",
    offence: "premature_departure",
    facts: {
      ...createEmptyChronologyDraft().facts,
      prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    },
    impact: "table_held",
    mitigation: "brings_dessert",
    statement: "He said he was leaving while still looking for his shoes.",
  };
}

describe("Chronology filing domain", () => {
  it("normalizes each supported adaptive fact grammar", () => {
    const premature = validateChronologyDraft(completeDraft(), "en");
    expect(premature).toMatchObject({
      status: "valid",
      filing: {
        department: "chronology",
        offence: "premature_departure",
        facts: { declaredTime: "19:30", delayMinutes: 24 },
      },
    });

    const lateDraft: ChronologyDraft = {
      ...completeDraft(),
      offence: "chronic_lateness",
      facts: {
        ...completeDraft().facts,
        chronicLateness: { agreedTime: "20:00", delayMinutes: "17" },
      },
    };
    expect(validateChronologyDraft(lateDraft, "en")).toMatchObject({
      status: "valid",
      filing: {
        offence: "chronic_lateness",
        facts: { agreedTime: "20:00", delayMinutes: 17 },
      },
    });

    const estimateDraft: ChronologyDraft = {
      ...completeDraft(),
      offence: "optimistic_estimate",
      facts: {
        ...completeDraft().facts,
        optimisticEstimate: { estimatedMinutes: "5", actualMinutes: "28" },
      },
    };
    expect(validateChronologyDraft(estimateDraft, "en")).toMatchObject({
      status: "valid",
      filing: {
        offence: "optimistic_estimate",
        facts: { estimatedMinutes: 5, actualMinutes: 28 },
      },
    });
  });

  it("rejects an estimate that was not exceeded", () => {
    const draft: ChronologyDraft = {
      ...completeDraft(),
      offence: "optimistic_estimate",
      facts: {
        ...completeDraft().facts,
        optimisticEstimate: { estimatedMinutes: "20", actualMinutes: "18" },
      },
    };
    expect(validateDraftField("chronology", draft)).toBe(
      "estimate_not_exceeded",
    );
  });

  it("requires mitigating context and bounds personal input", () => {
    expect(
      validateDraftField("mitigation", { ...completeDraft(), mitigation: "" }),
    ).toBe("required");
    expect(
      validateDraftField("respondent", {
        ...completeDraft(),
        respondent: "person@example.com",
      }),
    ).toBe("unnecessary_identifier");
    expect(
      validateDraftField("statement", {
        ...completeDraft(),
        statement: "Call them on +39 333 123 4567.",
      }),
    ).toBe("unnecessary_identifier");
  });

  it("conservatively redirects serious or sensitive matters", () => {
    expect(containsRestrictedContent("This describes abuse.")).toBe(true);
    expect(containsRestrictedContent("A harmless delay before dinner.")).toBe(
      false,
    );
    expect(
      validateDraftField("statement", {
        ...completeDraft(),
        statement: "They made a threat after dinner.",
      }),
    ).toBe("restricted_content");
  });

  it("rejects malformed runtime input and unsupported locales", () => {
    expect(
      validateChronologyDraft(
        { ...completeDraft(), relationship: "stranger" },
        "en",
      ).status,
    ).toBe("invalid");
    expect(validateChronologyDraft(completeDraft(), "ja").status).toBe(
      "invalid",
    );
  });

  it.each([
    "Ha descritto una minaccia.",
    "Il a décrit une menace.",
    "Es wurde eine Bedrohung beschrieben.",
    "Describió una amenaza.",
    "Descreveu uma ameaça.",
  ])("rejects localized serious content: %s", (statement) => {
    expect(containsRestrictedContent(statement)).toBe(true);
  });
});
