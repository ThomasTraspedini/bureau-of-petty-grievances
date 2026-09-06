import { describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import {
  createChronologyDeterminationLanguageCommand,
  createDigitalConductDeterminationLanguageCommand,
  createDomesticAffairsDeterminationLanguageCommand,
  createSocialPlanningDeterminationLanguageCommand,
} from "@/domain/determination/determination-language";
import {
  createDeterminationReference,
  determinationPresentationVariant,
  validateChronologyDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import {
  createBrazilianPortugueseChronologyFallback,
  createBrazilianPortugueseDigitalConductFallback,
  createBrazilianPortugueseDomesticAffairsFallback,
  createBrazilianPortugueseSocialPlanningFallback,
  validateBrazilianPortugueseChronologyLanguage,
  validateBrazilianPortugueseDigitalConductLanguage,
  validateBrazilianPortugueseDomesticAffairsLanguage,
  validateBrazilianPortugueseSocialPlanningLanguage,
} from "@/domain/determination/locales/pt-BR";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
import { OpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

describe("Brazilian Portuguese determination language", () => {
  it("provides a valid grounded Brazilian Portuguese fallback for every department", () => {
    const chronology: ChronologyFiling = {
      locale: "pt-BR",
      department: "chronology",
      respondent: "Rafael",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Rafael chegou depois do horário combinado.",
    };
    const digital: DigitalConductFiling = {
      locale: "pt-BR",
      department: "digital_conduct",
      respondent: "Rafael",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Rafael enviou os detalhes em muitas mensagens.",
    };
    const domestic: DomesticAffairsFiling = {
      locale: "pt-BR",
      department: "domestic_affairs",
      respondent: "Rafael",
      relationship: "roommate",
      offence: "empty_packaging",
      facts: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
      impact: "false_stock_signal",
      mitigation: "handles_other_chores",
      statement: "Rafael recolocou embalagens vazias.",
    };
    const social: SocialPlanningFiling = {
      locale: "pt-BR",
      department: "social_planning",
      respondent: "Rafael",
      relationship: "friend",
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 2, participantCount: 5, noticeHours: 8 },
      impact: "participants_waiting",
      mitigation: "usually_flexible",
      statement: "Rafael revisou um plano já confirmado.",
    };

    const chronologyCommand = createChronologyDeterminationLanguageCommand(
      chronology,
      assessChronologyFiling(chronology),
    );
    const digitalCommand = createDigitalConductDeterminationLanguageCommand(
      digital,
      assessDigitalConductFiling(digital),
    );
    const domesticCommand = createDomesticAffairsDeterminationLanguageCommand(
      domestic,
      assessDomesticAffairsFiling(domestic),
    );
    const socialCommand = createSocialPlanningDeterminationLanguageCommand(
      social,
      assessSocialPlanningFiling(social),
    );
    for (const command of [
      chronologyCommand,
      digitalCommand,
      domesticCommand,
      socialCommand,
    ])
      expect(command.status).toBe("valid");
    if (
      chronologyCommand.status !== "valid" ||
      digitalCommand.status !== "valid" ||
      domesticCommand.status !== "valid" ||
      socialCommand.status !== "valid"
    )
      throw new Error("Os comandos em português brasileiro são necessários.");

    const chronologyFallback = createBrazilianPortugueseChronologyFallback(
      chronologyCommand.command,
    );
    const digitalFallback = createBrazilianPortugueseDigitalConductFallback(
      digitalCommand.command,
    );
    const domesticFallback = createBrazilianPortugueseDomesticAffairsFallback(
      domesticCommand.command,
    );
    const socialFallback = createBrazilianPortugueseSocialPlanningFallback(
      socialCommand.command,
    );
    expect(
      validateBrazilianPortugueseChronologyLanguage(
        chronologyFallback,
        chronologyCommand.command,
      ),
    ).toEqual({ status: "valid", language: chronologyFallback });
    expect(
      validateBrazilianPortugueseDigitalConductLanguage(
        digitalFallback,
        digitalCommand.command,
      ),
    ).toEqual({ status: "valid", language: digitalFallback });
    expect(
      validateBrazilianPortugueseDomesticAffairsLanguage(
        domesticFallback,
        domesticCommand.command,
      ),
    ).toEqual({ status: "valid", language: domesticFallback });
    expect(
      validateBrazilianPortugueseSocialPlanningLanguage(
        socialFallback,
        socialCommand.command,
      ),
    ).toEqual({ status: "valid", language: socialFallback });
  });

  it("rejects Brazilian Portuguese coercion, surveillance, and invented numbers", () => {
    const filing: DigitalConductFiling = {
      locale: "pt-BR",
      department: "digital_conduct",
      respondent: "Rafael",
      relationship: "friend",
      offence: "unacknowledged_coordination",
      facts: { responseHours: 18, followUpCount: 2 },
      impact: "coordination_delayed",
      mitigation: "usually_clear",
      statement: "Rafael não respondeu.",
    };
    const result = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (result.status !== "valid")
      throw new Error("Um comando em português brasileiro é necessário.");
    const fallback = createBrazilianPortugueseDigitalConductFallback(
      result.command,
    );
    const validation = validateBrazilianPortugueseDigitalConductLanguage(
      {
        ...fallback,
        remedy: {
          ...fallback.remedy,
          instruction: {
            ...fallback.remedy.instruction,
            text: "A pessoa destinatária deve responder em 99 horas e ativar o monitoramento.",
          },
        },
      },
      result.command,
    );
    expect(validation.status).toBe("invalid");
    if (validation.status === "invalid") {
      expect(validation.issues).toContain("unsupported_number");
      expect(validation.issues).toContain("non_compliant_remedy");
    }
  });

  it("keeps the Brazilian Portuguese fallback and snapshot locale explicit end-to-end", async () => {
    const filing: ChronologyFiling = {
      locale: "pt-BR",
      department: "chronology",
      respondent: "Rafael",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Rafael chegou depois do horário combinado.",
    };
    const assessment = assessChronologyFiling(filing);
    const generated = await generateDeterminationLanguage({
      filing,
      assessment,
      provider: {
        generate() {
          return Promise.resolve({
            status: "terminal_failure" as const,
            reason: "configuration" as const,
          });
        },
      },
    });
    expect(generated).toMatchObject({
      status: "completed",
      source: "fallback",
      language: { locale: "pt-BR" },
    });
    if (generated.status !== "completed")
      throw new Error("Resultado necessário.");
    const issuedAt = new Date("2026-09-03T10:00:00.000Z");
    const reference = createDeterminationReference(
      issuedAt,
      "A1B2C3",
      "chronology",
    );
    expect(
      validateChronologyDeterminationSnapshot(
        {
          experienceVersion: 1,
          locale: "pt-BR",
          reference,
          issuedAt: issuedAt.toISOString(),
          assessment,
          language: generated.language,
          filing,
          presentationVariant: determinationPresentationVariant(
            reference,
            assessment.presentation.visualSeed,
          ),
        },
        issuedAt,
      ),
    ).toMatchObject({ status: "valid", snapshot: { locale: "pt-BR" } });
  });

  it("sends Brazilian Portuguese editorial instructions and a redacted Brazilian Portuguese command", async () => {
    const filing: DigitalConductFiling = {
      locale: "pt-BR",
      department: "digital_conduct",
      respondent: "Rafael",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Rafael enviou os detalhes em muitas mensagens.",
    };
    const command = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (command.status !== "valid")
      throw new Error("Comando em português brasileiro necessário.");
    const language = createBrazilianPortugueseDigitalConductFallback(
      command.command,
    );
    const requests: unknown[] = [];
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_pt_br",
        model: "gpt-5.6-luna",
        status: "completed",
        output_text: JSON.stringify(language),
        output: [],
      });
    });
    await expect(
      provider.generate(command.command, {
        attempt: 1,
        previousValidationIssues: [],
      }),
    ).resolves.toMatchObject({ status: "success", output: language });
    const serialized = JSON.stringify(requests[0]);
    expect(serialized).toContain("português brasileiro claro");
    expect(serialized).toContain("transcrição administrativa");
    expect(serialized).toContain("requiredSemanticReference");
    expect(serialized).toContain('\\"locale\\":\\"pt-BR\\"');
    expect(serialized).not.toContain("Rafael");
  });
});
