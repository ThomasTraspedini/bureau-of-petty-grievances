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
  createFrenchChronologyFallback,
  createFrenchDigitalConductFallback,
  createFrenchDomesticAffairsFallback,
  createFrenchSocialPlanningFallback,
  validateFrenchChronologyLanguage,
  validateFrenchDigitalConductLanguage,
  validateFrenchDomesticAffairsLanguage,
  validateFrenchSocialPlanningLanguage,
} from "@/domain/determination/locales/fr";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
import { OpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

describe("French determination language", () => {
  it("provides a valid grounded French fallback for every department", () => {
    const chronology: ChronologyFiling = {
      locale: "fr",
      department: "chronology",
      respondent: "Émile",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Émile est arrivé après l'heure convenue.",
    };
    const digital: DigitalConductFiling = {
      locale: "fr",
      department: "digital_conduct",
      respondent: "Émile",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Émile a envoyé les détails dans de nombreux messages.",
    };
    const domestic: DomesticAffairsFiling = {
      locale: "fr",
      department: "domestic_affairs",
      respondent: "Émile",
      relationship: "roommate",
      offence: "empty_packaging",
      facts: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
      impact: "false_stock_signal",
      mitigation: "handles_other_chores",
      statement: "Émile a remis en place des emballages vides.",
    };
    const social: SocialPlanningFiling = {
      locale: "fr",
      department: "social_planning",
      respondent: "Émile",
      relationship: "friend",
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 2, participantCount: 5, noticeHours: 8 },
      impact: "participants_waiting",
      mitigation: "usually_flexible",
      statement: "Émile a révisé un plan déjà confirmé.",
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
      throw new Error("Les commandes françaises sont requises.");

    const chronologyFallback = createFrenchChronologyFallback(
      chronologyCommand.command,
    );
    const digitalFallback = createFrenchDigitalConductFallback(
      digitalCommand.command,
    );
    const domesticFallback = createFrenchDomesticAffairsFallback(
      domesticCommand.command,
    );
    const socialFallback = createFrenchSocialPlanningFallback(
      socialCommand.command,
    );
    expect(
      validateFrenchChronologyLanguage(
        chronologyFallback,
        chronologyCommand.command,
      ),
    ).toEqual({ status: "valid", language: chronologyFallback });
    expect(
      validateFrenchDigitalConductLanguage(
        digitalFallback,
        digitalCommand.command,
      ),
    ).toEqual({ status: "valid", language: digitalFallback });
    expect(
      validateFrenchDomesticAffairsLanguage(
        domesticFallback,
        domesticCommand.command,
      ),
    ).toEqual({ status: "valid", language: domesticFallback });
    expect(
      validateFrenchSocialPlanningLanguage(
        socialFallback,
        socialCommand.command,
      ),
    ).toEqual({ status: "valid", language: socialFallback });
  });

  it("rejects French coercion, surveillance, and invented numbers", () => {
    const filing: DigitalConductFiling = {
      locale: "fr",
      department: "digital_conduct",
      respondent: "Émile",
      relationship: "friend",
      offence: "unacknowledged_coordination",
      facts: { responseHours: 18, followUpCount: 2 },
      impact: "coordination_delayed",
      mitigation: "usually_clear",
      statement: "Émile n'a pas répondu.",
    };
    const result = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (result.status !== "valid")
      throw new Error("Une commande française est requise.");
    const fallback = createFrenchDigitalConductFallback(result.command);
    const validation = validateFrenchDigitalConductLanguage(
      {
        ...fallback,
        remedy: {
          ...fallback.remedy,
          instruction: {
            ...fallback.remedy.instruction,
            text: "Le destinataire doit répondre sous 99 heures et activer la surveillance.",
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

  it("keeps the French fallback and snapshot locale explicit end-to-end", async () => {
    const filing: ChronologyFiling = {
      locale: "fr",
      department: "chronology",
      respondent: "Émile",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Émile est arrivé après l'heure convenue.",
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
      language: { locale: "fr" },
    });
    if (generated.status !== "completed") throw new Error("Résultat requis.");
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
          locale: "fr",
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
    ).toMatchObject({ status: "valid", snapshot: { locale: "fr" } });
  });

  it("sends French editorial instructions and a redacted French command", async () => {
    const filing: DigitalConductFiling = {
      locale: "fr",
      department: "digital_conduct",
      respondent: "Émile",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Émile a envoyé les détails dans de nombreux messages.",
    };
    const command = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (command.status !== "valid")
      throw new Error("Commande française requise.");
    const language = createFrenchDigitalConductFallback(command.command);
    const requests: unknown[] = [];
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_fr",
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
    expect(serialized).toContain("français clair");
    expect(serialized).toContain("procès-verbal");
    expect(serialized).toContain("requiredSemanticReference");
    expect(serialized).toContain('\\"locale\\":\\"fr\\"');
    expect(serialized).not.toContain("Émile");
  });
});
