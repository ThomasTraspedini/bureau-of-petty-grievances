import {
  createChronologyDeterminationLanguageCommand,
  type DeterminationLanguage,
} from "@/domain/determination/determination-language";
import type { ChronologyAssessment } from "@/domain/determination/chronology-assessment";
import {
  createEnglishChronologyFallback,
  EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION,
  validateEnglishChronologyLanguage,
  type DeterminationLanguageValidationIssueCode,
} from "@/domain/determination/locales/en";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type {
  DeterminationLanguageProvider,
  ProviderRetryableFailureReason,
  ProviderTerminalFailureReason,
  ProviderTokenUsage,
} from "@/providers/determination-language-provider";

export type DeterminationLanguageFallbackReason =
  | "refusal"
  | "invalid_output"
  | ProviderRetryableFailureReason
  | ProviderTerminalFailureReason;

export type GenerateDeterminationLanguageResult =
  | {
      status: "completed";
      source: "provider";
      language: DeterminationLanguage;
      editorialPolicyVersion: typeof EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION;
      attempts: 1 | 2;
      provider: { model: string; requestId: string };
      tokenUsage: ProviderTokenUsage;
    }
  | {
      status: "completed";
      source: "fallback";
      language: DeterminationLanguage;
      editorialPolicyVersion: typeof EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION;
      attempts: 1 | 2;
      reason: DeterminationLanguageFallbackReason;
      tokenUsage: ProviderTokenUsage;
      model?: string;
    }
  | {
      status: "rejected";
      reason: "assessment_mismatch";
    };

export interface GenerateDeterminationLanguageInput {
  filing: ChronologyFiling;
  assessment: ChronologyAssessment;
  provider: DeterminationLanguageProvider;
}

export async function generateDeterminationLanguage(
  input: GenerateDeterminationLanguageInput,
): Promise<GenerateDeterminationLanguageResult> {
  const commandResult = createChronologyDeterminationLanguageCommand(
    input.filing,
    input.assessment,
  );
  if (commandResult.status === "invalid") {
    return { status: "rejected", reason: commandResult.reason };
  }

  let previousValidationIssues: readonly DeterminationLanguageValidationIssueCode[] =
    [];
  let tokenUsage: ProviderTokenUsage = { inputTokens: 0, outputTokens: 0 };
  let observedModel: string | undefined;
  for (const attempt of [1, 2] as const) {
    const providerResult = await input.provider.generate(
      commandResult.command,
      {
        attempt,
        previousValidationIssues,
      },
    );
    tokenUsage = addUsage(tokenUsage, providerResult.usage);
    if (
      providerResult.status === "success" ||
      providerResult.status === "refusal"
    ) {
      observedModel = providerResult.model;
    }

    if (providerResult.status === "success") {
      const validation = validateEnglishChronologyLanguage(
        providerResult.output,
        commandResult.command,
      );
      if (validation.status === "valid") {
        return {
          status: "completed",
          source: "provider",
          language: validation.language,
          editorialPolicyVersion: EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION,
          attempts: attempt,
          provider: {
            model: providerResult.model,
            requestId: providerResult.requestId,
          },
          tokenUsage,
        };
      }
      if (attempt === 1) {
        previousValidationIssues = validation.issues;
        continue;
      }
      return fallbackResult(
        commandResult.command,
        attempt,
        "invalid_output",
        tokenUsage,
        observedModel,
      );
    }

    if (providerResult.status === "refusal") {
      return fallbackResult(
        commandResult.command,
        attempt,
        "refusal",
        tokenUsage,
        observedModel,
      );
    }
    if (providerResult.status === "terminal_failure") {
      return fallbackResult(
        commandResult.command,
        attempt,
        providerResult.reason,
        tokenUsage,
        observedModel,
      );
    }
    if (attempt === 2) {
      return fallbackResult(
        commandResult.command,
        attempt,
        providerResult.reason,
        tokenUsage,
        observedModel,
      );
    }
  }

  return fallbackResult(
    commandResult.command,
    2,
    "provider_unavailable",
    tokenUsage,
    observedModel,
  );
}

function fallbackResult(
  command: Parameters<typeof createEnglishChronologyFallback>[0],
  attempts: 1 | 2,
  reason: DeterminationLanguageFallbackReason,
  tokenUsage: ProviderTokenUsage,
  model?: string,
): GenerateDeterminationLanguageResult {
  return {
    status: "completed",
    source: "fallback",
    language: createEnglishChronologyFallback(command),
    editorialPolicyVersion: EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION,
    attempts,
    reason,
    tokenUsage,
    ...(model ? { model } : {}),
  };
}

function addUsage(
  total: ProviderTokenUsage,
  addition: ProviderTokenUsage | undefined,
): ProviderTokenUsage {
  if (!addition) return total;
  return {
    inputTokens: total.inputTokens + addition.inputTokens,
    outputTokens: total.outputTokens + addition.outputTokens,
  };
}
