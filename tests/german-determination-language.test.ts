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
  createGermanChronologyFallback,
  createGermanDigitalConductFallback,
  createGermanDomesticAffairsFallback,
  createGermanSocialPlanningFallback,
  validateGermanChronologyLanguage,
  validateGermanDigitalConductLanguage,
  validateGermanDomesticAffairsLanguage,
  validateGermanSocialPlanningLanguage,
} from "@/domain/determination/locales/de";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
import { OpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

describe("German determination language", () => {
  it("provides a valid grounded German fallback for every department", () => {
    const chronology: ChronologyFiling = {
      locale: "de",
      department: "chronology",
      respondent: "Lukas",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Lukas kam nach der vereinbarten Zeit an.",
    };
    const digital: DigitalConductFiling = {
      locale: "de",
      department: "digital_conduct",
      respondent: "Lukas",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Lukas versandte die Einzelheiten in vielen Nachrichten.",
    };
    const domestic: DomesticAffairsFiling = {
      locale: "de",
      department: "domestic_affairs",
      respondent: "Lukas",
      relationship: "roommate",
      offence: "empty_packaging",
      facts: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
      impact: "false_stock_signal",
      mitigation: "handles_other_chores",
      statement: "Lukas stellte leere Verpackungen zurück.",
    };
    const social: SocialPlanningFiling = {
      locale: "de",
      department: "social_planning",
      respondent: "Lukas",
      relationship: "friend",
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 2, participantCount: 5, noticeHours: 8 },
      impact: "participants_waiting",
      mitigation: "usually_flexible",
      statement: "Lukas änderte einen bereits bestätigten Plan.",
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
      throw new Error("German commands are required.");

    const chronologyFallback = createGermanChronologyFallback(
      chronologyCommand.command,
    );
    const digitalFallback = createGermanDigitalConductFallback(
      digitalCommand.command,
    );
    const domesticFallback = createGermanDomesticAffairsFallback(
      domesticCommand.command,
    );
    const socialFallback = createGermanSocialPlanningFallback(
      socialCommand.command,
    );
    expect(
      validateGermanChronologyLanguage(
        chronologyFallback,
        chronologyCommand.command,
      ),
    ).toEqual({ status: "valid", language: chronologyFallback });
    expect(
      validateGermanDigitalConductLanguage(
        digitalFallback,
        digitalCommand.command,
      ),
    ).toEqual({ status: "valid", language: digitalFallback });
    expect(
      validateGermanDomesticAffairsLanguage(
        domesticFallback,
        domesticCommand.command,
      ),
    ).toEqual({ status: "valid", language: domesticFallback });
    expect(
      validateGermanSocialPlanningLanguage(
        socialFallback,
        socialCommand.command,
      ),
    ).toEqual({ status: "valid", language: socialFallback });
  });

  it("rejects German coercion, surveillance, and invented numbers", () => {
    const filing: DigitalConductFiling = {
      locale: "de",
      department: "digital_conduct",
      respondent: "Lukas",
      relationship: "friend",
      offence: "unacknowledged_coordination",
      facts: { responseHours: 18, followUpCount: 2 },
      impact: "coordination_delayed",
      mitigation: "usually_clear",
      statement: "Lukas gab keine Rückmeldung.",
    };
    const result = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (result.status !== "valid")
      throw new Error("German command is required.");
    const fallback = createGermanDigitalConductFallback(result.command);
    const validation = validateGermanDigitalConductLanguage(
      {
        ...fallback,
        remedy: {
          ...fallback.remedy,
          instruction: {
            ...fallback.remedy.instruction,
            text: "Die betroffene Person muss binnen 99 Stunden antworten und die Überwachung aktivieren.",
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

  it("keeps the German fallback and snapshot locale explicit end-to-end", async () => {
    const filing: ChronologyFiling = {
      locale: "de",
      department: "chronology",
      respondent: "Lukas",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Lukas kam nach der vereinbarten Zeit an.",
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
      language: { locale: "de" },
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
          locale: "de",
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
    ).toMatchObject({ status: "valid", snapshot: { locale: "de" } });
  });

  it("sends German editorial instructions and a redacted German command", async () => {
    const filing: DigitalConductFiling = {
      locale: "de",
      department: "digital_conduct",
      respondent: "Lukas",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Lukas versandte die Einzelheiten in vielen Nachrichten.",
    };
    const command = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (command.status !== "valid") throw new Error("German command required.");
    const language = createGermanDigitalConductFallback(command.command);
    const requests: unknown[] = [];
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_de",
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
    expect(serialized).toContain("klarem, respektvollem Deutsch");
    expect(serialized).toContain('\\"locale\\":\\"de\\"');
    expect(serialized).not.toContain("Lukas");
  });
});
