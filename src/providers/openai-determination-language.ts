import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  RateLimitError,
  UnprocessableEntityError,
} from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import { DETERMINATION_LANGUAGE_JSON_SCHEMA } from "@/domain/determination/determination-language";
import {
  buildEnglishChronologyGenerationInput,
  EN_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
  EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION,
} from "@/domain/determination/locales/en";
import {
  buildEnglishDigitalConductGenerationInput,
  EN_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
  EN_DIGITAL_CONDUCT_EDITORIAL_POLICY_VERSION,
} from "@/domain/determination/locales/en-digital-conduct";
import {
  buildEnglishDomesticAffairsGenerationInput,
  EN_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
  EN_DOMESTIC_AFFAIRS_EDITORIAL_POLICY_VERSION,
} from "@/domain/determination/locales/en-domestic-affairs";
import {
  createUnavailableDeterminationLanguageProvider,
  type DeterminationLanguageProvider,
  type DeterminationLanguageProviderResult,
} from "@/providers/determination-language-provider";

export const DEFAULT_OPENAI_DETERMINATION_MODEL = "gpt-5.6-luna";
export const OPENAI_DETERMINATION_TIMEOUT_MS = 12_000;
export const OPENAI_DETERMINATION_MAX_RETRIES = 0;

type CreateResponse = (
  request: ResponseCreateParamsNonStreaming,
) => Promise<unknown>;

export interface OpenAIDeterminationLanguageProviderOptions {
  apiKey: string;
  model?: string;
}

export class OpenAIDeterminationLanguageProvider implements DeterminationLanguageProvider {
  readonly isConfigured = true;

  constructor(
    private readonly createResponse: CreateResponse,
    private readonly model = DEFAULT_OPENAI_DETERMINATION_MODEL,
  ) {}

  async generate(
    command: Parameters<DeterminationLanguageProvider["generate"]>[0],
    attempt: Parameters<DeterminationLanguageProvider["generate"]>[1],
  ): Promise<DeterminationLanguageProviderResult> {
    try {
      const instructions =
        command.department === "chronology"
          ? EN_CHRONOLOGY_EDITORIAL_INSTRUCTIONS
          : command.department === "digital_conduct"
            ? EN_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS
            : EN_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS;
      const input =
        command.department === "chronology"
          ? buildEnglishChronologyGenerationInput(
              command,
              attempt.previousValidationIssues,
            )
          : command.department === "digital_conduct"
            ? buildEnglishDigitalConductGenerationInput(
                command,
                attempt.previousValidationIssues,
              )
            : buildEnglishDomesticAffairsGenerationInput(
                command,
                attempt.previousValidationIssues,
              );
      const editorialPolicyVersion =
        command.department === "chronology"
          ? EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION
          : command.department === "digital_conduct"
            ? EN_DIGITAL_CONDUCT_EDITORIAL_POLICY_VERSION
            : EN_DOMESTIC_AFFAIRS_EDITORIAL_POLICY_VERSION;
      const response = await this.createResponse({
        model: this.model,
        store: false,
        instructions,
        input,
        max_output_tokens: 1_200,
        reasoning: { effort: "low", context: "current_turn" },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "bureau_determination_language",
            description:
              "Grounded localized Bureau determination language with explicit factual references.",
            strict: true,
            schema: DETERMINATION_LANGUAGE_JSON_SCHEMA,
          },
        },
        metadata: {
          editorial_policy_version: String(editorialPolicyVersion),
          department: command.department,
          language_schema_version: String(command.schemaVersion),
        },
      });

      return normalizeOpenAIResponse(response, this.model);
    } catch (error: unknown) {
      return normalizeOpenAIError(error);
    }
  }
}

export function createOpenAIDeterminationLanguageProvider(
  options: OpenAIDeterminationLanguageProviderOptions,
): DeterminationLanguageProvider {
  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: OPENAI_DETERMINATION_TIMEOUT_MS,
    maxRetries: OPENAI_DETERMINATION_MAX_RETRIES,
  });
  return new OpenAIDeterminationLanguageProvider(
    async (request) => client.responses.create(request),
    options.model ?? DEFAULT_OPENAI_DETERMINATION_MODEL,
  );
}

export function createConfiguredOpenAIDeterminationLanguageProvider(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DeterminationLanguageProvider {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) return createUnavailableDeterminationLanguageProvider();

  const configuredModel = environment.BUREAU_OPENAI_MODEL?.trim();
  return createOpenAIDeterminationLanguageProvider({
    apiKey,
    ...(configuredModel ? { model: configuredModel } : {}),
  });
}

function normalizeOpenAIResponse(
  value: unknown,
  requestedModel: string,
): DeterminationLanguageProviderResult {
  if (!isRecord(value)) {
    return { status: "retryable_failure", reason: "provider_unavailable" };
  }

  const requestId = typeof value.id === "string" ? value.id : "unavailable";
  const model = typeof value.model === "string" ? value.model : requestedModel;
  const usage = parseUsage(value.usage);
  if (hasRefusal(value.output)) {
    return { status: "refusal", model, requestId, ...(usage ? { usage } : {}) };
  }
  if (value.status !== "completed" || typeof value.output_text !== "string") {
    return { status: "retryable_failure", reason: "provider_unavailable" };
  }

  try {
    const output: unknown = JSON.parse(value.output_text);
    return {
      status: "success",
      output,
      model,
      requestId,
      ...(usage ? { usage } : {}),
    };
  } catch {
    return {
      status: "success",
      output: value.output_text,
      model,
      requestId,
      ...(usage ? { usage } : {}),
    };
  }
}

function parseUsage(value: unknown) {
  if (!isRecord(value)) return null;
  const inputTokens = value.input_tokens;
  const outputTokens = value.output_tokens;
  if (
    typeof inputTokens !== "number" ||
    !Number.isInteger(inputTokens) ||
    inputTokens < 0 ||
    typeof outputTokens !== "number" ||
    !Number.isInteger(outputTokens) ||
    outputTokens < 0
  ) {
    return null;
  }
  return { inputTokens, outputTokens };
}

function hasRefusal(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(
    (item) =>
      isRecord(item) &&
      Array.isArray(item.content) &&
      item.content.some(
        (content) => isRecord(content) && content.type === "refusal",
      ),
  );
}

function normalizeOpenAIError(
  error: unknown,
): DeterminationLanguageProviderResult {
  if (error instanceof APIConnectionTimeoutError) {
    return { status: "retryable_failure", reason: "timeout" };
  }
  if (error instanceof RateLimitError) {
    return { status: "retryable_failure", reason: "rate_limited" };
  }
  if (error instanceof APIConnectionError) {
    return { status: "retryable_failure", reason: "transport" };
  }
  if (
    error instanceof AuthenticationError ||
    error instanceof PermissionDeniedError
  ) {
    return { status: "terminal_failure", reason: "configuration" };
  }
  if (
    error instanceof BadRequestError ||
    error instanceof UnprocessableEntityError
  ) {
    return { status: "terminal_failure", reason: "request_rejected" };
  }
  if (error instanceof APIError && (error.status ?? 500) >= 500) {
    return { status: "retryable_failure", reason: "provider_unavailable" };
  }
  return { status: "terminal_failure", reason: "request_rejected" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
