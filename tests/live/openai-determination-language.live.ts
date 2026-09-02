import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import { createOpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

const filing: ChronologyFiling = {
  locale: "en",
  department: "chronology",
  respondent: "Sample respondent",
  relationship: "friend",
  offence: "premature_departure",
  facts: { declaredTime: "19:30", delayMinutes: 24 },
  impact: "table_held",
  mitigation: "brings_dessert",
  statement: "Shoes were still being located.",
};

describe("live OpenAI determination-language smoke", () => {
  it("returns validated provider language for one safe fixture", async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey)
      throw new Error("OPENAI_API_KEY is required for the live smoke");

    const model = process.env.BUREAU_OPENAI_MODEL?.trim();
    const provider = createOpenAIDeterminationLanguageProvider({
      apiKey,
      ...(model ? { model } : {}),
    });
    const result = await generateDeterminationLanguage({
      filing,
      assessment: assessChronologyFiling(filing),
      provider,
    });

    expect(result).toMatchObject({
      status: "completed",
      source: "provider",
      language: { locale: "en", schemaVersion: 1 },
    });
  });
});
