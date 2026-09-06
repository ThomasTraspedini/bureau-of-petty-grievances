import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  determinationPresentationVariant,
  type IssuedChronologyDetermination,
  type IssuedDigitalConductDetermination,
  type IssuedDomesticAffairsDetermination,
} from "@/domain/determination/determination-experience";
import { createDigitalConductDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createDomesticAffairsDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishDigitalConductFallback } from "@/domain/determination/locales/en-digital-conduct";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
import {
  type ChronologyDraft,
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptyDigitalConductDraft,
  type DigitalConductDraft,
  validateDigitalConductDraft,
} from "@/domain/filing/digital-conduct";
import {
  createEmptyDomesticAffairsDraft,
  type DomesticAffairsDraft,
  validateDomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
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

function completeDigitalDraft(): DigitalConductDraft {
  return {
    ...createEmptyDigitalConductDraft(),
    respondent: "Alex",
    relationship: "friend",
    offence: "unacknowledged_coordination",
    facts: {
      ...createEmptyDigitalConductDraft().facts,
      unacknowledgedCoordination: { responseHours: "18", followUpCount: "2" },
    },
    impact: "coordination_delayed",
    mitigation: "acknowledges_delay",
    statement: "Two ordinary follow-ups preceded an acknowledgement.",
  };
}

function issuedDigitalDetermination(): IssuedDigitalConductDetermination {
  const validated = validateDigitalConductDraft(completeDigitalDraft(), "en");
  if (validated.status === "invalid") {
    throw new Error("Digital determination session fixture must remain valid.");
  }
  const assessment = assessDigitalConductFiling(validated.filing);
  const command = createDigitalConductDeterminationLanguageCommand(
    validated.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid Digital command.");
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "DIG · 2026 · D4E5F6",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment,
    language: createEnglishDigitalConductFallback(command.command),
  };
}

function completeDomesticDraft(): DomesticAffairsDraft {
  return {
    ...createEmptyDomesticAffairsDraft(),
    respondent: "Riley",
    relationship: "roommate",
    offence: "token_remainder",
    facts: {
      ...createEmptyDomesticAffairsDraft().facts,
      tokenRemainder: { remainingServings: "1", capacityServings: "12" },
    },
    impact: "needed_item_unavailable",
    mitigation: "usually_restocks",
    statement: "One serving remained in the shared container.",
  };
}

function issuedDomesticDetermination(): IssuedDomesticAffairsDetermination {
  const validated = validateDomesticAffairsDraft(completeDomesticDraft(), "en");
  if (validated.status === "invalid")
    throw new Error("Invalid Domestic fixture.");
  const assessment = assessDomesticAffairsFiling(validated.filing);
  const command = createDomesticAffairsDeterminationLanguageCommand(
    validated.filing,
    assessment,
  );
  if (command.status === "invalid")
    throw new Error("Invalid Domestic command.");
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "DOM · 2026 · H0M3A1",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment,
    language: createEnglishDomesticAffairsFallback(command.command),
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

  it("restores a validated Digital Conduct determination without changing its localized snapshot", () => {
    const value = serializeDeterminationSession(
      completeDigitalDraft(),
      issuedDigitalDetermination(),
      now,
    );
    const result = parseDeterminationSession(value, now + 1_000);
    expect(result).toMatchObject({
      status: "restored",
      snapshot: {
        reference: "DIG · 2026 · D4E5F6",
        filing: {
          department: "digital_conduct",
          offence: "unacknowledged_coordination",
          facts: { responseHours: 18, followUpCount: 2 },
        },
        assessment: { department: "digital_conduct" },
      },
    });
  });

  it("restores a validated Domestic Affairs determination through the migrated envelope", () => {
    const value = serializeDeterminationSession(
      completeDomesticDraft(),
      issuedDomesticDetermination(),
      now,
    );
    expect(parseDeterminationSession(value, now + 1_000)).toMatchObject({
      status: "restored",
      snapshot: {
        reference: "DOM · 2026 · H0M3A1",
        filing: {
          department: "domestic_affairs",
          offence: "token_remainder",
          facts: { remainingServings: 1, capacityServings: 12 },
        },
        assessment: { department: "domestic_affairs" },
      },
    });
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
        value.replace('"version":5', '"version":6'),
        now,
      ).status,
    ).toBe("invalid");
  });
});
