import {
  createDeterminationLanguageCommand,
  type DeterminationLanguageCommand,
  type DeterminationLanguage,
} from "@/domain/determination/determination-language";
import type { DeterminationAssessment } from "@/domain/determination/assessment";
import {
  createEnglishChronologyFallback,
  EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION,
  validateEnglishChronologyLanguage,
  type DeterminationLanguageValidationIssueCode,
} from "@/domain/determination/locales/en";
import type { Filing } from "@/domain/filing/filing";
import {
  createEnglishDigitalConductFallback,
  EN_DIGITAL_CONDUCT_EDITORIAL_POLICY_VERSION,
  validateEnglishDigitalConductLanguage,
} from "@/domain/determination/locales/en-digital-conduct";
import {
  createEnglishDomesticAffairsFallback,
  EN_DOMESTIC_AFFAIRS_EDITORIAL_POLICY_VERSION,
  validateEnglishDomesticAffairsLanguage,
} from "@/domain/determination/locales/en-domestic-affairs";
import {
  createEnglishSocialPlanningFallback,
  EN_SOCIAL_PLANNING_EDITORIAL_POLICY_VERSION,
  validateEnglishSocialPlanningLanguage,
} from "@/domain/determination/locales/en-social-planning";
import {
  createItalianChronologyFallback,
  createItalianDigitalConductFallback,
  createItalianDomesticAffairsFallback,
  createItalianSocialPlanningFallback,
  IT_EDITORIAL_POLICY_VERSION,
  validateItalianChronologyLanguage,
  validateItalianDigitalConductLanguage,
  validateItalianDomesticAffairsLanguage,
  validateItalianSocialPlanningLanguage,
} from "@/domain/determination/locales/it";
import {
  createFrenchChronologyFallback,
  createFrenchDigitalConductFallback,
  createFrenchDomesticAffairsFallback,
  createFrenchSocialPlanningFallback,
  FR_EDITORIAL_POLICY_VERSION,
  validateFrenchChronologyLanguage,
  validateFrenchDigitalConductLanguage,
  validateFrenchDomesticAffairsLanguage,
  validateFrenchSocialPlanningLanguage,
} from "@/domain/determination/locales/fr";
import {
  createGermanChronologyFallback,
  createGermanDigitalConductFallback,
  createGermanDomesticAffairsFallback,
  createGermanSocialPlanningFallback,
  DE_EDITORIAL_POLICY_VERSION,
  validateGermanChronologyLanguage,
  validateGermanDigitalConductLanguage,
  validateGermanDomesticAffairsLanguage,
  validateGermanSocialPlanningLanguage,
} from "@/domain/determination/locales/de";
import {
  createSpanishChronologyFallback,
  createSpanishDigitalConductFallback,
  createSpanishDomesticAffairsFallback,
  createSpanishSocialPlanningFallback,
  ES_EDITORIAL_POLICY_VERSION,
  validateSpanishChronologyLanguage,
  validateSpanishDigitalConductLanguage,
  validateSpanishDomesticAffairsLanguage,
  validateSpanishSocialPlanningLanguage,
} from "@/domain/determination/locales/es";
import {
  createBrazilianPortugueseChronologyFallback,
  createBrazilianPortugueseDigitalConductFallback,
  createBrazilianPortugueseDomesticAffairsFallback,
  createBrazilianPortugueseSocialPlanningFallback,
  PT_BR_EDITORIAL_POLICY_VERSION,
  validateBrazilianPortugueseChronologyLanguage,
  validateBrazilianPortugueseDigitalConductLanguage,
  validateBrazilianPortugueseDomesticAffairsLanguage,
  validateBrazilianPortugueseSocialPlanningLanguage,
} from "@/domain/determination/locales/pt-BR";
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
      editorialPolicyVersion: 1;
      attempts: 1 | 2;
      provider: { model: string; requestId: string };
      tokenUsage: ProviderTokenUsage;
    }
  | {
      status: "completed";
      source: "fallback";
      language: DeterminationLanguage;
      editorialPolicyVersion: 1;
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
  filing: Filing;
  assessment: DeterminationAssessment;
  provider: DeterminationLanguageProvider;
}

export async function generateDeterminationLanguage(
  input: GenerateDeterminationLanguageInput,
): Promise<GenerateDeterminationLanguageResult> {
  const commandResult = createDeterminationLanguageCommand(
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
      const validation = validateLanguage(
        providerResult.output,
        commandResult.command,
      );
      if (validation.status === "valid") {
        return {
          status: "completed",
          source: "provider",
          language: validation.language,
          editorialPolicyVersion: editorialPolicyVersion(commandResult.command),
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
  command: DeterminationLanguageCommand,
  attempts: 1 | 2,
  reason: DeterminationLanguageFallbackReason,
  tokenUsage: ProviderTokenUsage,
  model?: string,
): GenerateDeterminationLanguageResult {
  return {
    status: "completed",
    source: "fallback",
    language:
      command.locale === "en"
        ? command.department === "chronology"
          ? createEnglishChronologyFallback(command)
          : command.department === "digital_conduct"
            ? createEnglishDigitalConductFallback(command)
            : command.department === "domestic_affairs"
              ? createEnglishDomesticAffairsFallback(command)
              : createEnglishSocialPlanningFallback(command)
        : localizedFallback(command),
    editorialPolicyVersion: editorialPolicyVersion(command),
    attempts,
    reason,
    tokenUsage,
    ...(model ? { model } : {}),
  };
}

function localizedFallback(
  command: DeterminationLanguageCommand,
): DeterminationLanguage {
  switch (command.locale) {
    case "it":
      if (command.department === "chronology")
        return createItalianChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createItalianDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createItalianDomesticAffairsFallback(command);
      return createItalianSocialPlanningFallback(command);
    case "fr":
      if (command.department === "chronology")
        return createFrenchChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createFrenchDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createFrenchDomesticAffairsFallback(command);
      return createFrenchSocialPlanningFallback(command);
    case "de":
      if (command.department === "chronology")
        return createGermanChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createGermanDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createGermanDomesticAffairsFallback(command);
      return createGermanSocialPlanningFallback(command);
    case "es":
      if (command.department === "chronology")
        return createSpanishChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createSpanishDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createSpanishDomesticAffairsFallback(command);
      return createSpanishSocialPlanningFallback(command);
    case "pt-BR":
      if (command.department === "chronology")
        return createBrazilianPortugueseChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createBrazilianPortugueseDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createBrazilianPortugueseDomesticAffairsFallback(command);
      return createBrazilianPortugueseSocialPlanningFallback(command);
    default:
      if (command.department === "chronology")
        return createEnglishChronologyFallback(command);
      if (command.department === "digital_conduct")
        return createEnglishDigitalConductFallback(command);
      if (command.department === "domestic_affairs")
        return createEnglishDomesticAffairsFallback(command);
      return createEnglishSocialPlanningFallback(command);
  }
}

function validateLanguage(
  value: unknown,
  command: DeterminationLanguageCommand,
) {
  if (command.locale === "it") return validateItalian(value, command);
  if (command.locale === "fr") return validateFrench(value, command);
  if (command.locale === "de") return validateGerman(value, command);
  if (command.locale === "es") return validateSpanish(value, command);
  if (command.locale === "pt-BR")
    return validateBrazilianPortuguese(value, command);
  if (command.department === "chronology")
    return validateEnglishChronologyLanguage(value, command);
  if (command.department === "digital_conduct")
    return validateEnglishDigitalConductLanguage(value, command);
  return command.department === "domestic_affairs"
    ? validateEnglishDomesticAffairsLanguage(value, command)
    : validateEnglishSocialPlanningLanguage(value, command);
}

function editorialPolicyVersion(command: DeterminationLanguageCommand): 1 {
  if (command.locale === "it") return IT_EDITORIAL_POLICY_VERSION;
  if (command.locale === "fr") return FR_EDITORIAL_POLICY_VERSION;
  if (command.locale === "de") return DE_EDITORIAL_POLICY_VERSION;
  if (command.locale === "es") return ES_EDITORIAL_POLICY_VERSION;
  if (command.locale === "pt-BR") return PT_BR_EDITORIAL_POLICY_VERSION;
  if (command.department === "chronology")
    return EN_CHRONOLOGY_EDITORIAL_POLICY_VERSION;
  if (command.department === "digital_conduct")
    return EN_DIGITAL_CONDUCT_EDITORIAL_POLICY_VERSION;
  return command.department === "domestic_affairs"
    ? EN_DOMESTIC_AFFAIRS_EDITORIAL_POLICY_VERSION
    : EN_SOCIAL_PLANNING_EDITORIAL_POLICY_VERSION;
}

function validateItalian(
  value: unknown,
  command: DeterminationLanguageCommand,
) {
  if (command.department === "chronology")
    return validateItalianChronologyLanguage(value, command);
  if (command.department === "digital_conduct")
    return validateItalianDigitalConductLanguage(value, command);
  return command.department === "domestic_affairs"
    ? validateItalianDomesticAffairsLanguage(value, command)
    : validateItalianSocialPlanningLanguage(value, command);
}

function validateFrench(value: unknown, command: DeterminationLanguageCommand) {
  if (command.department === "chronology")
    return validateFrenchChronologyLanguage(value, command);
  if (command.department === "digital_conduct")
    return validateFrenchDigitalConductLanguage(value, command);
  return command.department === "domestic_affairs"
    ? validateFrenchDomesticAffairsLanguage(value, command)
    : validateFrenchSocialPlanningLanguage(value, command);
}

function validateGerman(value: unknown, command: DeterminationLanguageCommand) {
  if (command.department === "chronology")
    return validateGermanChronologyLanguage(value, command);
  if (command.department === "digital_conduct")
    return validateGermanDigitalConductLanguage(value, command);
  return command.department === "domestic_affairs"
    ? validateGermanDomesticAffairsLanguage(value, command)
    : validateGermanSocialPlanningLanguage(value, command);
}

function validateSpanish(
  value: unknown,
  command: DeterminationLanguageCommand,
) {
  if (command.department === "chronology")
    return validateSpanishChronologyLanguage(value, command);
  if (command.department === "digital_conduct")
    return validateSpanishDigitalConductLanguage(value, command);
  return command.department === "domestic_affairs"
    ? validateSpanishDomesticAffairsLanguage(value, command)
    : validateSpanishSocialPlanningLanguage(value, command);
}

function validateBrazilianPortuguese(
  value: unknown,
  command: DeterminationLanguageCommand,
) {
  if (command.department === "chronology")
    return validateBrazilianPortugueseChronologyLanguage(value, command);
  if (command.department === "digital_conduct")
    return validateBrazilianPortugueseDigitalConductLanguage(value, command);
  return command.department === "domestic_affairs"
    ? validateBrazilianPortugueseDomesticAffairsLanguage(value, command)
    : validateBrazilianPortugueseSocialPlanningLanguage(value, command);
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
