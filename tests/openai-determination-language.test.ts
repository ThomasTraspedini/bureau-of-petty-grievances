import { APIConnectionTimeoutError } from "openai";
import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import {
  createChronologyDeterminationLanguageCommand,
  createDigitalConductDeterminationLanguageCommand,
  createDomesticAffairsDeterminationLanguageCommand,
  createSocialPlanningDeterminationLanguageCommand,
} from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import { createEnglishDigitalConductFallback } from "@/domain/determination/locales/en-digital-conduct";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
import { createEnglishSocialPlanningFallback } from "@/domain/determination/locales/en-social-planning";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
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

const digitalFiling: DigitalConductFiling = {
  locale: "en",
  department: "digital_conduct",
  respondent: "Alex",
  relationship: "friend",
  offence: "fragmented_messages",
  facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
  impact: "notification_burden",
  mitigation: "provides_summary",
  statement: "The dinner plan arrived through eight separate notifications.",
};

const domesticFiling: DomesticAffairsFiling = {
  locale: "en",
  department: "domestic_affairs",
  respondent: "Riley",
  relationship: "roommate",
  offence: "misplaced_object",
  facts: { itemCount: 4, distanceSteps: 8, correctionSeconds: 45 },
  impact: "shared_space_obstructed",
  mitigation: "handles_other_chores",
  statement: "Four objects remained beside their ordinary location.",
};

const socialFiling: SocialPlanningFiling = {
  locale: "en",
  department: "social_planning",
  respondent: "Taylor",
  relationship: "friend",
  offence: "decision_drift",
  facts: { decisionRoundCount: 5, elapsedHours: 72, participantCount: 4 },
  impact: "participants_waiting",
  mitigation: "usually_flexible",
  statement: "Five rounds passed without a dinner date.",
};

function command() {
  const result = createChronologyDeterminationLanguageCommand(
    filing,
    assessChronologyFiling(filing),
  );
  if (result.status === "invalid") throw new Error(result.reason);
  return result.command;
}

function digitalCommand() {
  const result = createDigitalConductDeterminationLanguageCommand(
    digitalFiling,
    assessDigitalConductFiling(digitalFiling),
  );
  if (result.status === "invalid") throw new Error(result.reason);
  return result.command;
}

function domesticCommand() {
  const result = createDomesticAffairsDeterminationLanguageCommand(
    domesticFiling,
    assessDomesticAffairsFiling(domesticFiling),
  );
  if (result.status === "invalid") throw new Error(result.reason);
  return result.command;
}

function socialCommand() {
  const result = createSocialPlanningDeterminationLanguageCommand(
    socialFiling,
    assessSocialPlanningFiling(socialFiling),
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

  it("uses the Digital Conduct editorial boundary and excludes respondent identity", async () => {
    const requests: unknown[] = [];
    const language = createEnglishDigitalConductFallback(digitalCommand());
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_digital",
        model: "gpt-5.6-luna",
        status: "completed",
        output_text: JSON.stringify(language),
        output: [],
      });
    });

    await expect(
      provider.generate(digitalCommand(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toMatchObject({ status: "success", output: language });
    expect(requests[0]).toMatchObject({
      metadata: { department: "digital_conduct" },
    });
    const serialized = JSON.stringify(requests[0]);
    expect(serialized).toContain("Never require immediate replies");
    expect(serialized).toContain('\\"messageCount\\":8');
    expect(serialized).not.toContain("Alex");
  });

  it("uses the Domestic Affairs editorial boundary without external household access", async () => {
    const requests: unknown[] = [];
    const language = createEnglishDomesticAffairsFallback(domesticCommand());
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_domestic",
        model: "gpt-5.6-luna",
        status: "completed",
        output_text: JSON.stringify(language),
        output: [],
      });
    });
    await expect(
      provider.generate(domesticCommand(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toMatchObject({ status: "success", output: language });
    expect(requests[0]).toMatchObject({
      metadata: { department: "domestic_affairs" },
    });
    const serialized = JSON.stringify(requests[0]);
    expect(serialized).toContain("no photo, sensor, home map");
    expect(serialized).toContain('\\"distanceSteps\\":8');
    expect(serialized).not.toContain("Riley");
  });

  it("uses the Social Planning editorial boundary without external planning access", async () => {
    const requests: unknown[] = [];
    const language = createEnglishSocialPlanningFallback(socialCommand());
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_social",
        model: "gpt-5.6-luna",
        status: "completed",
        output_text: JSON.stringify(language),
        output: [],
      });
    });
    await expect(
      provider.generate(socialCommand(), {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toMatchObject({ status: "success", output: language });
    expect(requests[0]).toMatchObject({
      metadata: { department: "social_planning" },
    });
    const serialized = JSON.stringify(requests[0]);
    expect(serialized).toContain("no calendar, message, contact");
    expect(serialized).toContain('\\"elapsedHours\\":72');
    expect(serialized).not.toContain("Taylor");
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
