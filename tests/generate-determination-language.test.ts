import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { createChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type {
  DeterminationLanguageProvider,
  DeterminationLanguageProviderAttempt,
  DeterminationLanguageProviderResult,
} from "@/providers/determination-language-provider";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

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

function validLanguage() {
  const command = createChronologyDeterminationLanguageCommand(
    filing,
    assessChronologyFiling(filing),
  );
  if (command.status === "invalid") throw new Error(command.reason);
  return createEnglishChronologyFallback(command.command);
}

class QueuedProvider implements DeterminationLanguageProvider {
  readonly attempts: DeterminationLanguageProviderAttempt[] = [];

  constructor(
    private readonly results: readonly DeterminationLanguageProviderResult[],
  ) {}

  async generate(
    _command: Parameters<DeterminationLanguageProvider["generate"]>[0],
    attempt: DeterminationLanguageProviderAttempt,
  ): Promise<DeterminationLanguageProviderResult> {
    await Promise.resolve();
    this.attempts.push(attempt);
    const result = this.results[this.attempts.length - 1];
    if (!result) throw new Error("Missing queued provider result");
    return result;
  }
}

describe("determination-language server orchestration", () => {
  it("accepts grounded provider output on the first attempt", async () => {
    const provider = new QueuedProvider([
      {
        status: "success",
        output: validLanguage(),
        model: "gpt-5.6-luna",
        requestId: "resp_1",
      },
    ]);

    await expect(
      generateDeterminationLanguage({
        filing,
        assessment: assessChronologyFiling(filing),
        provider,
      }),
    ).resolves.toMatchObject({
      status: "completed",
      source: "provider",
      attempts: 1,
      editorialPolicyVersion: 1,
      provider: { model: "gpt-5.6-luna", requestId: "resp_1" },
    });
  });

  it("retries invalid output once with categorical validation feedback", async () => {
    const provider = new QueuedProvider([
      {
        status: "success",
        output: { malformed: true },
        model: "gpt-5.6-luna",
        requestId: "resp_bad",
        usage: { inputTokens: 300, outputTokens: 100 },
      },
      {
        status: "success",
        output: validLanguage(),
        model: "gpt-5.6-luna",
        requestId: "resp_good",
        usage: { inputTokens: 200, outputTokens: 80 },
      },
    ]);

    const result = await generateDeterminationLanguage({
      filing,
      assessment: assessChronologyFiling(filing),
      provider,
    });

    expect(result).toMatchObject({
      source: "provider",
      attempts: 2,
      tokenUsage: { inputTokens: 500, outputTokens: 180 },
    });
    expect(provider.attempts).toEqual([
      { attempt: 1, previousValidationIssues: [] },
      { attempt: 2, previousValidationIssues: ["invalid_schema"] },
    ]);
  });

  it("retries a transient failure once and then accepts valid output", async () => {
    const provider = new QueuedProvider([
      { status: "retryable_failure", reason: "timeout" },
      {
        status: "success",
        output: validLanguage(),
        model: "gpt-5.6-luna",
        requestId: "resp_after_timeout",
      },
    ]);

    await expect(
      generateDeterminationLanguage({
        filing,
        assessment: assessChronologyFiling(filing),
        provider,
      }),
    ).resolves.toMatchObject({ source: "provider", attempts: 2 });
  });

  it.each([
    [
      { status: "refusal", model: "gpt-5.6-luna", requestId: "resp_refusal" },
      "refusal",
    ],
    [{ status: "terminal_failure", reason: "configuration" }, "configuration"],
  ] as const)(
    "falls back immediately for %s",
    async (providerResult, expectedReason) => {
      const provider = new QueuedProvider([providerResult]);
      await expect(
        generateDeterminationLanguage({
          filing,
          assessment: assessChronologyFiling(filing),
          provider,
        }),
      ).resolves.toMatchObject({
        status: "completed",
        source: "fallback",
        attempts: 1,
        reason: expectedReason,
        language: { locale: "en", schemaVersion: 1 },
      });
    },
  );

  it("uses fallback after the bounded second failure", async () => {
    const provider = new QueuedProvider([
      { status: "retryable_failure", reason: "rate_limited" },
      { status: "retryable_failure", reason: "timeout" },
    ]);
    await expect(
      generateDeterminationLanguage({
        filing,
        assessment: assessChronologyFiling(filing),
        provider,
      }),
    ).resolves.toMatchObject({
      source: "fallback",
      attempts: 2,
      reason: "timeout",
    });
  });

  it("uses fallback after two invalid responses without retaining provider text", async () => {
    const provider = new QueuedProvider([
      {
        status: "success",
        output: "raw provider failure one",
        model: "gpt-5.6-luna",
        requestId: "resp_bad_1",
      },
      {
        status: "success",
        output: "raw provider failure two",
        model: "gpt-5.6-luna",
        requestId: "resp_bad_2",
      },
    ]);
    const result = await generateDeterminationLanguage({
      filing,
      assessment: assessChronologyFiling(filing),
      provider,
    });

    expect(result).toMatchObject({
      source: "fallback",
      attempts: 2,
      reason: "invalid_output",
    });
    expect(JSON.stringify(result)).not.toContain("raw provider failure");
  });

  it("rejects a mismatched assessment before calling the provider", async () => {
    const provider = new QueuedProvider([]);
    const mismatched = assessChronologyFiling({
      ...filing,
      facts: { declaredTime: "19:30", delayMinutes: 8 },
    });
    await expect(
      generateDeterminationLanguage({
        filing,
        assessment: mismatched,
        provider,
      }),
    ).resolves.toEqual({
      status: "rejected",
      reason: "assessment_mismatch",
    });
    expect(provider.attempts).toHaveLength(0);
  });
});
