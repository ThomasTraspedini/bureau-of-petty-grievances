import { describe, expect, it } from "vitest";

import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import { createDomesticAffairsDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import {
  createEnglishDomesticAffairsFallback,
  validateEnglishDomesticAffairsLanguage,
} from "@/domain/determination/locales/en-domestic-affairs";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";

function filings(): readonly DomesticAffairsFiling[] {
  const common = {
    locale: "en" as const,
    department: "domestic_affairs" as const,
    respondent: "Sam",
    relationship: "roommate" as const,
    impact: "false_stock_signal" as const,
    mitigation: "handles_other_chores" as const,
    statement: "Sam returned the empty carton to the shared shelf twice.",
  };
  return [
    {
      ...common,
      offence: "token_remainder",
      facts: { remainingServings: 1, capacityServings: 12 },
    },
    {
      ...common,
      offence: "misplaced_object",
      facts: { itemCount: 4, distanceSteps: 8, correctionSeconds: 45 },
    },
    {
      ...common,
      offence: "empty_packaging",
      facts: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
    },
  ];
}

describe("English Domestic Affairs determination language", () => {
  it("provides a valid grounded fallback for every classification", () => {
    for (const filing of filings()) {
      const result = createDomesticAffairsDeterminationLanguageCommand(
        filing,
        assessDomesticAffairsFiling(filing),
      );
      expect(result.status).toBe("valid");
      if (result.status === "valid") {
        const fallback = createEnglishDomesticAffairsFallback(result.command);
        expect(
          validateEnglishDomesticAffairsLanguage(fallback, result.command),
        ).toEqual({ status: "valid", language: fallback });
        expect(JSON.stringify(result.command)).not.toContain("Sam");
      }
    }
  });

  it("rejects household surveillance, disposal, payment, and invented facts", () => {
    const filing = filings()[0];
    if (!filing) throw new Error("Domestic filing fixture missing.");
    const result = createDomesticAffairsDeterminationLanguageCommand(
      filing,
      assessDomesticAffairsFiling(filing),
    );
    if (result.status === "invalid") throw new Error("Invalid command.");
    const fallback = createEnglishDomesticAffairsFallback(result.command);
    const unsafe = {
      ...fallback,
      remedy: {
        ...fallback.remedy,
        instruction: {
          ...fallback.remedy.instruction,
          text: "The respondent must install a camera, discard property, and pay a fine.",
        },
      },
    };
    const validation = validateEnglishDomesticAffairsLanguage(
      unsafe,
      result.command,
    );
    expect(validation.status).toBe("invalid");
    if (validation.status === "invalid") {
      expect(validation.issues).toContain("prohibited_claim");
      expect(validation.issues).toContain("non_compliant_remedy");
    }
  });
});
