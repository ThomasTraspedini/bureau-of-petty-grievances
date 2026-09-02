import { describe, expect, it } from "vitest";

import { completeFilingReview } from "@/app/[locale]/file/[step]/actions";
import {
  type ChronologyDraft,
  createEmptyChronologyDraft,
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
    statement: "Shoes were still being located.",
  };
}

describe("complete filing server boundary", () => {
  it("assesses a runtime-validated filing without issuing a determination", async () => {
    await expect(
      completeFilingReview("en", completeDraft()),
    ).resolves.toMatchObject({
      status: "accepted",
      assessment: {
        assessmentVersion: 1,
        offence: "premature_departure",
        severity: { base: "established", assessed: "material" },
        remedyConstraints: {
          family: "departure_language_protocol",
          binding: "non_binding",
        },
      },
    });
  });

  it("does not assess malformed or unsupported-locale input", async () => {
    await expect(
      completeFilingReview("fr", completeDraft()),
    ).resolves.toMatchObject({ status: "rejected" });
    await expect(
      completeFilingReview("en", { ...completeDraft(), impact: "revenge" }),
    ).resolves.toMatchObject({ status: "rejected" });
  });
});
