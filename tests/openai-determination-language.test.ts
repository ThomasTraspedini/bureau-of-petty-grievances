import { APIConnectionTimeoutError } from "openai";
import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { createChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import {
  createConfiguredOpenAIDeterminationLanguageProvider,
  DEFAULT_OPENAI_DETERMINATION_MODEL,
  OpenAIDeterminationLanguageProvider,
} from "@/providers/openai-determination-language";

const filing: ChronologyFiling = {
  locale: "en",
  department: "chronology",
  respondent: "Marco",
  relationship: "friend",
  offence: "premature_departure",
  facts: { declaredTime: "19:30", delayMinutes: 24 },
  impact: "table_held",
  mitigation: "brings_dessert",
  statement: "Shoes were still being located.",
};

function command() {
  const result = createChronologyDeterminationLanguageCommand(
    filing,
    assessChronologyFiling(filing),
  );
  if (result.status === "invalid") throw new Error(result.reason);
  return result.command;
}

describe("OpenAI determination-language adapter", () => {
  it("sends one non-persistent Luna structured-output request", async () => {
    const requests: unknown[] = [];
    const language = createEnglishChronologyFallback(command());
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_123",
        model: "gpt-5.6-luna",
        status: "completed",
        output_text: JSON.stringify(language),
        output: [],
        usage: { input_tokens: 420, output_tokens: 210 },
      });
    });

    await expect(
      provider.generate(command(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toMatchObject({
      status: "success",
      output: language,
      model: "gpt-5.6-luna",
      requestId: "resp_123",
      usage: { inputTokens: 420, outputTokens: 210 },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      model: DEFAULT_OPENAI_DETERMINATION_MODEL,
      store: false,
      max_output_tokens: 1200,
      reasoning: { effort: "low", context: "current_turn" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          strict: true,
          name: "bureau_determination_language",
          schema: {
            type: "object",
            additionalProperties: false,
          },
        },
      },
      metadata: {
        editorial_policy_version: "1",
        language_schema_version: "1",
      },
    });
    expect(JSON.stringify(requests[0])).not.toContain("Marco");
    expect(JSON.stringify(requests[0])).not.toContain("19:30");
  });

  it("normalizes refusal without returning refusal text", async () => {
    const provider = new OpenAIDeterminationLanguageProvider(() =>
      Promise.resolve({
        id: "resp_refusal",
        model: "gpt-5.6-luna",
        status: "completed",
        output_text: "",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "raw refusal" }],
          },
        ],
      }),
    );
    const result = await provider.generate(command(), {
      attempt: 1,
      previousValidationIssues: [],
    });

    expect(result).toEqual({
      status: "refusal",
      model: "gpt-5.6-luna",
      requestId: "resp_refusal",
    });
    expect(JSON.stringify(result)).not.toContain("raw refusal");
  });

  it("normalizes timeouts and incomplete responses as retryable failures", async () => {
    const timeoutProvider = new OpenAIDeterminationLanguageProvider(() =>
      Promise.reject(new APIConnectionTimeoutError()),
    );
    await expect(
      timeoutProvider.generate(command(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toEqual({ status: "retryable_failure", reason: "timeout" });

    const incompleteProvider = new OpenAIDeterminationLanguageProvider(() =>
      Promise.resolve({ status: "incomplete", output: [], output_text: "" }),
    );
    await expect(
      incompleteProvider.generate(command(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toEqual({
      status: "retryable_failure",
      reason: "provider_unavailable",
    });
  });

  it("returns a typed configuration failure when no API key is configured", async () => {
    const provider = createConfiguredOpenAIDeterminationLanguageProvider({});
    await expect(
      provider.generate(command(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toEqual({
      status: "terminal_failure",
      reason: "configuration",
    });
  });
});
