import { describe, expect, it } from "vitest";

import {
  type ChronologyDraft,
  createEmptyChronologyDraft,
} from "@/domain/filing/chronology";
import { createUnavailableDeterminationLanguageProvider } from "@/providers/determination-language-provider";
import { completeFilingReviewWith } from "@/server/determination/complete-filing-review";

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
    statement: "Shoes were still being located.",
  };
}

const dependencies = {
  provider: createUnavailableDeterminationLanguageProvider(),
  now: () => new Date("2026-09-02T12:00:00.000Z"),
  randomReferencePart: () => "A1B2C3",
};

describe("complete filing server boundary", () => {
  it("issues a fallback-backed determination after runtime validation", async () => {
    await expect(
      completeFilingReviewWith("en", completeDraft(), dependencies),
    ).resolves.toMatchObject({
      status: "accepted",
      determination: {
        experienceVersion: 1,
        locale: "en",
        reference: "CHR · 2026 · A1B2C3",
        issuedAt: "2026-09-02T12:00:00.000Z",
        assessment: {
          assessmentVersion: 1,
          offence: "premature_departure",
          severity: { base: "established", assessed: "material" },
          remedyConstraints: {
            family: "departure_language_protocol",
            binding: "non_binding",
          },
        },
        language: {
          disposition: "upheld_with_circumstances_noted",
          remedy: { title: "Departure language protocol" },
        },
      },
    });
  });

  it("does not issue a determination for malformed or unsupported-locale input", async () => {
    await expect(
      completeFilingReviewWith("fr", completeDraft(), dependencies),
    ).resolves.toMatchObject({ status: "rejected" });
    await expect(
      completeFilingReviewWith(
        "en",
        { ...completeDraft(), impact: "revenge" },
        dependencies,
      ),
    ).resolves.toMatchObject({ status: "rejected" });
  });

  it("maps an unexpected orchestration failure to a typed terminal outcome", async () => {
    const result = await completeFilingReviewWith("en", completeDraft(), {
      ...dependencies,
      provider: {
        async generate() {
          await Promise.resolve();
          throw new Error("internal provider detail");
        },
      },
    });
    expect(result).toEqual({ status: "failed" });
  });
});
