import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  determinationPresentationVariant,
  type IssuedChronologyDetermination,
} from "@/domain/determination/determination-experience";
import {
  type ChronologyDraft,
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  DETERMINATION_SESSION_LIFETIME_MS,
  parseDeterminationSession,
  serializeDeterminationSession,
} from "@/features/determination/determination-session";
import { CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES } from "./fixtures/chronology-determination-language";

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

function issuedDetermination(): IssuedChronologyDetermination {
  const validated = validateChronologyDraft(completeDraft(), "en");
  const fixture = CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES[0];
  if (validated.status === "invalid" || !fixture) {
    throw new Error("Determination session fixtures must remain valid.");
  }
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "CHR · 2026 · A1B2C3",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment: assessChronologyFiling(validated.filing),
    language: fixture.language,
  };
}

describe("tab-scoped determination state", () => {
  const now = Date.parse("2026-09-02T12:01:00.000Z");

  it("restores a validated determination and derives a stable presentation", () => {
    const value = serializeDeterminationSession(
      completeDraft(),
      issuedDetermination(),
      now,
    );
    const result = parseDeterminationSession(value, now + 1_000);
    expect(result).toMatchObject({
      status: "restored",
      snapshot: {
        reference: "CHR · 2026 · A1B2C3",
        filing: { respondent: "Marco", offence: "premature_departure" },
        language: { disposition: "upheld_with_circumstances_noted" },
      },
    });
    if (result.status === "restored") {
      expect(result.snapshot.presentationVariant).toBe(
        determinationPresentationVariant(
          result.snapshot.reference,
          result.snapshot.assessment.presentation.visualSeed,
        ),
      );
    }
  });

  it("expires after the tab-session lifetime", () => {
    const value = serializeDeterminationSession(
      completeDraft(),
      issuedDetermination(),
      now,
    );
    expect(
      parseDeterminationSession(
        value,
        now + DETERMINATION_SESSION_LIFETIME_MS + 1,
      ).status,
    ).toBe("expired");
  });

  it("rejects tampered facts, prose, identity, and envelope versions", () => {
    const value = serializeDeterminationSession(
      completeDraft(),
      issuedDetermination(),
      now,
    );
    expect(
      parseDeterminationSession(
        value.replace('"delayMinutes":"24"', '"delayMinutes":"25"'),
        now,
      ).status,
    ).toBe("invalid");
    expect(
      parseDeterminationSession(
        value.replace("preceded departure by 24", "preceded departure by 25"),
        now,
      ).status,
    ).toBe("invalid");
    expect(
      parseDeterminationSession(
        value.replace("CHR · 2026 · A1B2C3", "public-record-1"),
        now,
      ).status,
    ).toBe("invalid");
    expect(
      parseDeterminationSession(
        value.replace('"version":1', '"version":2'),
        now,
      ).status,
    ).toBe("invalid");
  });
});
