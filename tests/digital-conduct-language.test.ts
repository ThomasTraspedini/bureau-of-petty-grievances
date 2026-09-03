import { describe, expect, it } from "vitest";

import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { createDigitalConductDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import {
  createEnglishDigitalConductFallback,
  validateEnglishDigitalConductLanguage,
} from "@/domain/determination/locales/en-digital-conduct";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";

function filings(): readonly DigitalConductFiling[] {
  const common = {
    locale: "en" as const,
    department: "digital_conduct" as const,
    respondent: "Alex",
    relationship: "friend" as const,
    impact: "notification_burden" as const,
    mitigation: "provides_summary" as const,
    statement: "Alex sent the dinner details across several alerts.",
  };
  return [
    {
      ...common,
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
    },
    {
      ...common,
      offence: "excessive_voice_note",
      facts: { durationMinutes: 7, ideaCount: 2 },
    },
    {
      ...common,
      offence: "unacknowledged_coordination",
      facts: { responseHours: 18, followUpCount: 2 },
    },
  ];
}

describe("English Digital Conduct determination language", () => {
  it("produces a valid grounded fallback for every classification", () => {
    for (const filing of filings()) {
      const result = createDigitalConductDeterminationLanguageCommand(
        filing,
        assessDigitalConductFiling(filing),
      );
      expect(result.status).toBe("valid");
      if (result.status === "valid") {
        const fallback = createEnglishDigitalConductFallback(result.command);
        expect(
          validateEnglishDigitalConductLanguage(fallback, result.command),
        ).toEqual({
          status: "valid",
          language: fallback,
        });
        expect(JSON.stringify(result.command)).not.toContain("Alex");
      }
    }
  });

  it("rejects coercive response obligations and invented numbers", () => {
    const filing = filings()[2];
    if (!filing) throw new Error("A fixture is required.");
    const result = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (result.status === "invalid") throw new Error("A command is required.");
    const fallback = createEnglishDigitalConductFallback(result.command);
    const invalid = {
      ...fallback,
      remedy: {
        ...fallback.remedy,
        instruction: {
          ...fallback.remedy.instruction,
          text: "The respondent must reply within 99 hours and enable monitoring.",
        },
      },
    };
    const validation = validateEnglishDigitalConductLanguage(
      invalid,
      result.command,
    );
    expect(validation.status).toBe("invalid");
    if (validation.status === "invalid") {
      expect(validation.issues).toContain("unsupported_number");
      expect(validation.issues).toContain("non_compliant_remedy");
    }
  });
});
