import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import { createOpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

const fixtures = [
  { locale: "en", statement: "Shoes were still being located." },
  { locale: "it", statement: "Le scarpe dovevano ancora essere ritrovate." },
  {
    locale: "fr",
    statement: "Les chaussures devaient encore être retrouvées.",
  },
  { locale: "de", statement: "Die Schuhe mussten noch gefunden werden." },
  { locale: "es", statement: "Todavía había que encontrar los zapatos." },
  {
    locale: "pt-BR",
    statement: "Os sapatos ainda precisavam ser encontrados.",
  },
] as const;

describe("live OpenAI determination-language smoke", () => {
  it.each(fixtures)(
    "returns validated provider language for $locale",
    async ({ locale, statement }) => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey)
        throw new Error("OPENAI_API_KEY is required for the live smoke");

      const model = process.env.BUREAU_OPENAI_MODEL?.trim();
      const provider = createOpenAIDeterminationLanguageProvider({
        apiKey,
        ...(model ? { model } : {}),
      });
      const filing: ChronologyFiling = {
        locale,
        department: "chronology",
        respondent: "Sample respondent",
        relationship: "friend",
        offence: "premature_departure",
        facts: { declaredTime: "19:30", delayMinutes: 24 },
        impact: "table_held",
        mitigation: "brings_dessert",
        statement,
      };
      const result = await generateDeterminationLanguage({
        filing,
        assessment: assessChronologyFiling(filing),
        provider,
      });

      expect(result, JSON.stringify(result)).toMatchObject({
        status: "completed",
        source: "provider",
        language: { locale, schemaVersion: 1 },
      });
    },
  );
});
