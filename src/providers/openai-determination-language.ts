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

import {
  DETERMINATION_LANGUAGE_JSON_SCHEMA,
  DETERMINATION_LANGUAGE_SCHEMA_VERSION,
  type DeterminationLanguage,
  type DeterminationLanguageCommand,
} from "@/domain/determination/determination-language";
import { createDeterministicDeterminationLanguage } from "@/domain/determination/deterministic-language";
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
  buildEnglishSocialPlanningGenerationInput,
  EN_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
  EN_SOCIAL_PLANNING_EDITORIAL_POLICY_VERSION,
} from "@/domain/determination/locales/en-social-planning";
import {
  buildItalianChronologyGenerationInput,
  buildItalianDigitalConductGenerationInput,
  buildItalianDomesticAffairsGenerationInput,
  buildItalianSocialPlanningGenerationInput,
  IT_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
  IT_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
  IT_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
  IT_EDITORIAL_POLICY_VERSION,
  IT_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
} from "@/domain/determination/locales/it";
import * as french from "@/domain/determination/locales/fr";
import * as german from "@/domain/determination/locales/de";
import * as spanish from "@/domain/determination/locales/es";
import * as brazilianPortuguese from "@/domain/determination/locales/pt-BR";
import {
  createUnavailableDeterminationLanguageProvider,
  type DeterminationLanguageProvider,
  type DeterminationLanguageProviderResult,
} from "@/providers/determination-language-provider";

export const DEFAULT_OPENAI_DETERMINATION_MODEL = "gpt-5.6-terra";
export const OPENAI_DETERMINATION_TIMEOUT_MS = 18_000;
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
      const policy = generationPolicy(
        command,
        attempt.previousValidationIssues,
      );
      const instructions = `${policy.instructions}\n\n${PROVIDER_PROSE_CONTRACT[command.locale]}`;
      const input = addSemanticReference(policy.input, command);
      const editorialPolicyVersion = policy.editorialPolicyVersion;
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

      return normalizeOpenAIResponse(response, this.model, command);
    } catch (error: unknown) {
      return normalizeOpenAIError(error);
    }
  }
}

const PROVIDER_PROSE_CONTRACT = {
  en: "Return only the prose fields required by the response schema; the server supplies locale, disposition, and factual grounding. Render allegation as an officer's formal paraphrase of the filed account, never as a quotation. Give the finding one precise, unexpectedly attentive bureaucratic observation grounded only in the submitted facts. Preserve verbatim the localized severity term used in the semantic reference finding. Each consequence, mitigation, and remedy must retain at least one distinctive domain term from its matching semantic reference, while the surrounding sentences must be original.",
  it: "Restituisci solo i campi di prosa previsti dallo schema; locale, disposizione e riferimenti fattuali sono applicati dal server. Redigi l'allegazione come trascrizione d'ufficio del resoconto depositato, con il burocratese formale e involontariamente solenne di un verbale, mai come citazione. Inserisci nell'accertamento un'osservazione amministrativa precisa e sorprendentemente premurosa, fondata solo sui fatti presentati. Conserva alla lettera il termine italiano della gravità usato nell'accertamento del riferimento semantico. Conseguenza, attenuante e rimedio devono mantenere almeno un termine distintivo del rispettivo riferimento semantico, dentro frasi altrimenti originali.",
  fr: "Retourne uniquement les champs de prose du schéma; le serveur ajoute la langue, la décision et les références factuelles. Rédige l'allégation comme la reformulation formelle d'un procès-verbal, jamais comme une citation. Ajoute au constat une observation administrative précise et étonnamment attentive, fondée uniquement sur les faits déposés. Conserve mot pour mot le terme français de gravité employé dans le constat de la référence sémantique. La conséquence, la circonstance atténuante et le remède doivent chacun conserver au moins un terme distinctif de leur référence sémantique, dans des phrases par ailleurs originales.",
  de: "Gib ausschließlich die Prosafelder des Schemas zurück; Sprache, Entscheidung und Tatsachenbezüge ergänzt der Server. Formuliere die Darlegung als förmliche amtliche Umschreibung des eingereichten Berichts, nie als Zitat. Ergänze die Feststellung um eine präzise, unerwartet aufmerksame Verwaltungsbeobachtung, die nur auf den eingereichten Tatsachen beruht. Übernimm den lokalisierten Schweregradbegriff aus der Feststellung der semantischen Referenz wortgetreu. Folge, Milderung und Abhilfe müssen jeweils mindestens einen kennzeichnenden Fachbegriff ihrer semantischen Referenz in ansonsten eigenständigen Sätzen beibehalten.",
  es: "Devuelve únicamente los campos de prosa del esquema; el servidor añade idioma, disposición y referencias fácticas. Redacta la alegación como transcripción administrativa formal del relato presentado, nunca como cita. Incluye en la conclusión una observación burocrática precisa y sorprendentemente atenta, basada solo en los hechos aportados. Conserva literalmente el término español de gravedad utilizado en la conclusión de la referencia semántica. La consecuencia, la atenuante y el remedio deben conservar al menos un término distintivo de su referencia semántica dentro de frases por lo demás originales.",
  "pt-BR":
    "Retorne somente os campos de prosa do esquema; o servidor acrescenta idioma, decisão e referências factuais. Redija a alegação como transcrição administrativa formal do relato apresentado, nunca como citação. Inclua na constatação uma observação burocrática precisa e surpreendentemente atenciosa, baseada apenas nos fatos fornecidos. Preserve literalmente o termo brasileiro de gravidade usado na constatação da referência semântica. Consequência, atenuante e remédio devem manter pelo menos um termo distintivo da respectiva referência semântica em frases de redação original.",
} as const;

function addSemanticReference(
  input: string,
  command: DeterminationLanguageCommand,
): string {
  const parsed: unknown = JSON.parse(input);
  const reference = createDeterministicDeterminationLanguage(command);
  return JSON.stringify({
    ...(isRecord(parsed) ? parsed : { submittedRecord: command }),
    requiredSemanticReference: {
      purpose:
        "These localized phrases establish validator vocabulary and factual anchors. Preserve their facts and key domain terms, while writing original prose.",
      allegation: reference.allegation.text,
      finding: reference.finding.text,
      consequence: reference.consequence.text,
      mitigation: reference.mitigation.text,
      remedy: `${reference.remedy.title}. ${reference.remedy.instruction.text}`,
    },
  });
}

function italianInput(
  command: Parameters<DeterminationLanguageProvider["generate"]>[0],
  previousIssues: Parameters<
    DeterminationLanguageProvider["generate"]
  >[1]["previousValidationIssues"],
): string {
  if (command.department === "chronology")
    return buildItalianChronologyGenerationInput(command, previousIssues);
  if (command.department === "digital_conduct")
    return buildItalianDigitalConductGenerationInput(command, previousIssues);
  if (command.department === "domestic_affairs")
    return buildItalianDomesticAffairsGenerationInput(command, previousIssues);
  return buildItalianSocialPlanningGenerationInput(command, previousIssues);
}

type GenerationCommand = Parameters<
  DeterminationLanguageProvider["generate"]
>[0];
type ValidationIssues = Parameters<
  DeterminationLanguageProvider["generate"]
>[1]["previousValidationIssues"];

function generationPolicy(
  command: GenerationCommand,
  previousIssues: ValidationIssues,
): { instructions: string; input: string; editorialPolicyVersion: 1 | 2 } {
  if (command.locale === "it") {
    return {
      instructions:
        command.department === "chronology"
          ? IT_CHRONOLOGY_EDITORIAL_INSTRUCTIONS
          : command.department === "digital_conduct"
            ? IT_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS
            : command.department === "domestic_affairs"
              ? IT_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS
              : IT_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
      input: italianInput(command, previousIssues),
      editorialPolicyVersion: IT_EDITORIAL_POLICY_VERSION,
    };
  }
  if (command.locale === "fr") return frenchPolicy(command, previousIssues);
  if (command.locale === "de") return germanPolicy(command, previousIssues);
  if (command.locale === "es") return spanishPolicy(command, previousIssues);
  if (command.locale === "pt-BR")
    return brazilianPortuguesePolicy(command, previousIssues);
  return englishPolicy(command, previousIssues);
}

function englishPolicy(command: GenerationCommand, issues: ValidationIssues) {
  if (command.department === "chronology")
    return {
      instructions: EN_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
      input: buildEnglishChronologyGenerationInput(command, issues),
      editorialPolicyVersion: EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "digital_conduct")
    return {
      instructions: EN_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
      input: buildEnglishDigitalConductGenerationInput(command, issues),
      editorialPolicyVersion: EN_DIGITAL_CONDUCT_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "domestic_affairs")
    return {
      instructions: EN_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
      input: buildEnglishDomesticAffairsGenerationInput(command, issues),
      editorialPolicyVersion: EN_DOMESTIC_AFFAIRS_EDITORIAL_POLICY_VERSION,
    };
  return {
    instructions: EN_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
    input: buildEnglishSocialPlanningGenerationInput(command, issues),
    editorialPolicyVersion: EN_SOCIAL_PLANNING_EDITORIAL_POLICY_VERSION,
  };
}

function frenchPolicy(command: GenerationCommand, issues: ValidationIssues) {
  if (command.department === "chronology")
    return {
      instructions: french.FR_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
      input: french.buildFrenchChronologyGenerationInput(command, issues),
      editorialPolicyVersion: french.FR_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "digital_conduct")
    return {
      instructions: french.FR_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
      input: french.buildFrenchDigitalConductGenerationInput(command, issues),
      editorialPolicyVersion: french.FR_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "domestic_affairs")
    return {
      instructions: french.FR_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
      input: french.buildFrenchDomesticAffairsGenerationInput(command, issues),
      editorialPolicyVersion: french.FR_EDITORIAL_POLICY_VERSION,
    };
  return {
    instructions: french.FR_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
    input: french.buildFrenchSocialPlanningGenerationInput(command, issues),
    editorialPolicyVersion: french.FR_EDITORIAL_POLICY_VERSION,
  };
}

function germanPolicy(command: GenerationCommand, issues: ValidationIssues) {
  if (command.department === "chronology")
    return {
      instructions: german.DE_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
      input: german.buildGermanChronologyGenerationInput(command, issues),
      editorialPolicyVersion: german.DE_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "digital_conduct")
    return {
      instructions: german.DE_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
      input: german.buildGermanDigitalConductGenerationInput(command, issues),
      editorialPolicyVersion: german.DE_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "domestic_affairs")
    return {
      instructions: german.DE_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
      input: german.buildGermanDomesticAffairsGenerationInput(command, issues),
      editorialPolicyVersion: german.DE_EDITORIAL_POLICY_VERSION,
    };
  return {
    instructions: german.DE_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
    input: german.buildGermanSocialPlanningGenerationInput(command, issues),
    editorialPolicyVersion: german.DE_EDITORIAL_POLICY_VERSION,
  };
}

function spanishPolicy(command: GenerationCommand, issues: ValidationIssues) {
  if (command.department === "chronology")
    return {
      instructions: spanish.ES_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
      input: spanish.buildSpanishChronologyGenerationInput(command, issues),
      editorialPolicyVersion: spanish.ES_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "digital_conduct")
    return {
      instructions: spanish.ES_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
      input: spanish.buildSpanishDigitalConductGenerationInput(command, issues),
      editorialPolicyVersion: spanish.ES_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "domestic_affairs")
    return {
      instructions: spanish.ES_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
      input: spanish.buildSpanishDomesticAffairsGenerationInput(
        command,
        issues,
      ),
      editorialPolicyVersion: spanish.ES_EDITORIAL_POLICY_VERSION,
    };
  return {
    instructions: spanish.ES_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
    input: spanish.buildSpanishSocialPlanningGenerationInput(command, issues),
    editorialPolicyVersion: spanish.ES_EDITORIAL_POLICY_VERSION,
  };
}

function brazilianPortuguesePolicy(
  command: GenerationCommand,
  issues: ValidationIssues,
) {
  if (command.department === "chronology")
    return {
      instructions: brazilianPortuguese.PT_BR_CHRONOLOGY_EDITORIAL_INSTRUCTIONS,
      input:
        brazilianPortuguese.buildBrazilianPortugueseChronologyGenerationInput(
          command,
          issues,
        ),
      editorialPolicyVersion:
        brazilianPortuguese.PT_BR_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "digital_conduct")
    return {
      instructions:
        brazilianPortuguese.PT_BR_DIGITAL_CONDUCT_EDITORIAL_INSTRUCTIONS,
      input:
        brazilianPortuguese.buildBrazilianPortugueseDigitalConductGenerationInput(
          command,
          issues,
        ),
      editorialPolicyVersion:
        brazilianPortuguese.PT_BR_EDITORIAL_POLICY_VERSION,
    };
  if (command.department === "domestic_affairs")
    return {
      instructions:
        brazilianPortuguese.PT_BR_DOMESTIC_AFFAIRS_EDITORIAL_INSTRUCTIONS,
      input:
        brazilianPortuguese.buildBrazilianPortugueseDomesticAffairsGenerationInput(
          command,
          issues,
        ),
      editorialPolicyVersion:
        brazilianPortuguese.PT_BR_EDITORIAL_POLICY_VERSION,
    };
  return {
    instructions:
      brazilianPortuguese.PT_BR_SOCIAL_PLANNING_EDITORIAL_INSTRUCTIONS,
    input:
      brazilianPortuguese.buildBrazilianPortugueseSocialPlanningGenerationInput(
        command,
        issues,
      ),
    editorialPolicyVersion: brazilianPortuguese.PT_BR_EDITORIAL_POLICY_VERSION,
  };
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
  command: DeterminationLanguageCommand,
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
    const parsed: unknown = JSON.parse(value.output_text);
    const output = assembleDeterminationLanguage(parsed, command) ?? parsed;
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

function assembleDeterminationLanguage(
  value: unknown,
  command: DeterminationLanguageCommand,
): DeterminationLanguage | null {
  if (
    !isExactRecord(value, [
      "allegation",
      "finding",
      "consequence",
      "mitigation",
      "remedy",
      "closing",
    ]) ||
    typeof value.allegation !== "string" ||
    typeof value.finding !== "string" ||
    typeof value.consequence !== "string" ||
    typeof value.mitigation !== "string" ||
    typeof value.closing !== "string" ||
    !isExactRecord(value.remedy, ["title", "instruction"]) ||
    typeof value.remedy.title !== "string" ||
    typeof value.remedy.instruction !== "string"
  ) {
    return null;
  }

  const incidentGrounding = [
    "offence",
    command.department === "chronology" ? "discrepancy" : "evidence",
  ] as const;
  return {
    schemaVersion: DETERMINATION_LANGUAGE_SCHEMA_VERSION,
    locale: command.locale,
    disposition: command.disposition,
    allegation: {
      text: value.allegation,
      grounding: [...incidentGrounding, "witness_statement"],
    },
    finding: {
      text: value.finding,
      grounding: [...incidentGrounding, "severity"],
    },
    consequence: { text: value.consequence, grounding: ["impact"] },
    mitigation: { text: value.mitigation, grounding: ["mitigation"] },
    remedy: {
      title: value.remedy.title,
      instruction: {
        text: value.remedy.instruction,
        grounding: ["remedy_family", "remedy_limit", "relationship_context"],
      },
    },
    closing: value.closing,
  };
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

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
