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
  createSpanishChronologyFallback,
  createSpanishDigitalConductFallback,
  createSpanishDomesticAffairsFallback,
  createSpanishSocialPlanningFallback,
  validateSpanishChronologyLanguage,
  validateSpanishDigitalConductLanguage,
  validateSpanishDomesticAffairsLanguage,
  validateSpanishSocialPlanningLanguage,
} from "@/domain/determination/locales/es";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
import { OpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

describe("Spanish determination language", () => {
  it("provides a valid grounded Spanish fallback for every department", () => {
    const chronology: ChronologyFiling = {
      locale: "es",
      department: "chronology",
      respondent: "Luca",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Luca llegó después de la hora acordada.",
    };
    const digital: DigitalConductFiling = {
      locale: "es",
      department: "digital_conduct",
      respondent: "Luca",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Luca envió los detalles en muchos mensajes.",
    };
    const domestic: DomesticAffairsFiling = {
      locale: "es",
      department: "domestic_affairs",
      respondent: "Luca",
      relationship: "roommate",
      offence: "empty_packaging",
      facts: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
      impact: "false_stock_signal",
      mitigation: "handles_other_chores",
      statement: "Luca devolvió envases vacíos.",
    };
    const social: SocialPlanningFiling = {
      locale: "es",
      department: "social_planning",
      respondent: "Luca",
      relationship: "friend",
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 2, participantCount: 5, noticeHours: 8 },
      impact: "participants_waiting",
      mitigation: "usually_flexible",
      statement: "Luca revisó un plan ya confirmado.",
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
      throw new Error("Spanish commands are required.");

    const chronologyFallback = createSpanishChronologyFallback(
      chronologyCommand.command,
    );
    const digitalFallback = createSpanishDigitalConductFallback(
      digitalCommand.command,
    );
    const domesticFallback = createSpanishDomesticAffairsFallback(
      domesticCommand.command,
    );
    const socialFallback = createSpanishSocialPlanningFallback(
      socialCommand.command,
    );
    expect(
      validateSpanishChronologyLanguage(
        chronologyFallback,
        chronologyCommand.command,
      ),
    ).toEqual({ status: "valid", language: chronologyFallback });
    expect(
      validateSpanishDigitalConductLanguage(
        digitalFallback,
        digitalCommand.command,
      ),
    ).toEqual({ status: "valid", language: digitalFallback });
    expect(
      validateSpanishDomesticAffairsLanguage(
        domesticFallback,
        domesticCommand.command,
      ),
    ).toEqual({ status: "valid", language: domesticFallback });
    expect(
      validateSpanishSocialPlanningLanguage(
        socialFallback,
        socialCommand.command,
      ),
    ).toEqual({ status: "valid", language: socialFallback });
  });

  it("rejects Spanish coercion, surveillance, and invented numbers", () => {
    const filing: DigitalConductFiling = {
      locale: "es",
      department: "digital_conduct",
      respondent: "Luca",
      relationship: "friend",
      offence: "unacknowledged_coordination",
      facts: { responseHours: 18, followUpCount: 2 },
      impact: "coordination_delayed",
      mitigation: "usually_clear",
      statement: "Luca no respondió.",
    };
    const result = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (result.status !== "valid")
      throw new Error("Spanish command is required.");
    const fallback = createSpanishDigitalConductFallback(result.command);
    const validation = validateSpanishDigitalConductLanguage(
      {
        ...fallback,
        remedy: {
          ...fallback.remedy,
          instruction: {
            ...fallback.remedy.instruction,
            text: "El destinatario debe responder en 99 horas y activar la vigilancia.",
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

  it("keeps the Spanish fallback and snapshot locale explicit end-to-end", async () => {
    const filing: ChronologyFiling = {
      locale: "es",
      department: "chronology",
      respondent: "Luca",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Luca llegó después de la hora acordada.",
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
      language: { locale: "es" },
    });
    if (generated.status !== "completed") throw new Error("Result required.");
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
          locale: "es",
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
    ).toMatchObject({ status: "valid", snapshot: { locale: "es" } });
  });

  it("sends Spanish editorial instructions and a redacted Spanish command", async () => {
    const filing: DigitalConductFiling = {
      locale: "es",
      department: "digital_conduct",
      respondent: "Luca",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Luca envió los detalles en muchos mensajes.",
    };
    const command = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (command.status !== "valid")
      throw new Error("Spanish command required.");
    const language = createSpanishDigitalConductFallback(command.command);
    const requests: unknown[] = [];
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_es",
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
    expect(serialized).toContain("Escribe en español");
    expect(serialized).toContain('\\"locale\\":\\"es\\"');
    expect(serialized).not.toContain("Luca");
  });
});
