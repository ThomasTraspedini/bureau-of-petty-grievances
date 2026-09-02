import type { ChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import type { DeterminationLanguageValidationIssueCode } from "@/domain/determination/locales/en";

export type ProviderRetryableFailureReason =
  "timeout" | "rate_limited" | "transport" | "provider_unavailable";

export type ProviderTerminalFailureReason =
  "configuration" | "request_rejected";

export type DeterminationLanguageProviderResult =
  | {
      status: "success";
      output: unknown;
      model: string;
      requestId: string;
    }
  | { status: "refusal"; model: string; requestId: string }
  | {
      status: "retryable_failure";
      reason: ProviderRetryableFailureReason;
    }
  | {
      status: "terminal_failure";
      reason: ProviderTerminalFailureReason;
    };

export interface DeterminationLanguageProviderAttempt {
  attempt: 1 | 2;
  previousValidationIssues: readonly DeterminationLanguageValidationIssueCode[];
}

export interface DeterminationLanguageProvider {
  readonly isConfigured?: boolean;
  generate(
    command: ChronologyDeterminationLanguageCommand,
    attempt: DeterminationLanguageProviderAttempt,
  ): Promise<DeterminationLanguageProviderResult>;
}

export function createUnavailableDeterminationLanguageProvider(): DeterminationLanguageProvider {
  return {
    isConfigured: false,
    async generate() {
      await Promise.resolve();
      return { status: "terminal_failure", reason: "configuration" };
    },
  };
}
