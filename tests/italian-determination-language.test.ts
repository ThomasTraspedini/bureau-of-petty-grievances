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
  createItalianChronologyFallback,
  createItalianDigitalConductFallback,
  createItalianDomesticAffairsFallback,
  createItalianSocialPlanningFallback,
  validateItalianChronologyLanguage,
  validateItalianDigitalConductLanguage,
  validateItalianDomesticAffairsLanguage,
  validateItalianSocialPlanningLanguage,
} from "@/domain/determination/locales/it";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import type { ChronologyFiling } from "@/domain/filing/chronology";
import type { DigitalConductFiling } from "@/domain/filing/digital-conduct";
import type { DomesticAffairsFiling } from "@/domain/filing/domestic-affairs";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";
import { OpenAIDeterminationLanguageProvider } from "@/providers/openai-determination-language";
import { generateDeterminationLanguage } from "@/server/determination/generate-determination-language";

describe("Italian determination language", () => {
  it("provides a valid grounded Italian fallback for every department", () => {
    const chronology: ChronologyFiling = {
      locale: "it",
      department: "chronology",
      respondent: "Luca",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Luca è arrivato dopo l'orario concordato.",
    };
    const digital: DigitalConductFiling = {
      locale: "it",
      department: "digital_conduct",
      respondent: "Luca",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Luca ha inviato i dettagli in molti messaggi.",
    };
    const domestic: DomesticAffairsFiling = {
      locale: "it",
      department: "domestic_affairs",
      respondent: "Luca",
      relationship: "roommate",
      offence: "empty_packaging",
      facts: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
      impact: "false_stock_signal",
      mitigation: "handles_other_chores",
      statement: "Luca ha riposto confezioni vuote.",
    };
    const social: SocialPlanningFiling = {
      locale: "it",
      department: "social_planning",
      respondent: "Luca",
      relationship: "friend",
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 2, participantCount: 5, noticeHours: 8 },
      impact: "participants_waiting",
      mitigation: "usually_flexible",
      statement: "Luca ha rivisto un piano già confermato.",
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
      throw new Error("Italian commands are required.");

    const chronologyFallback = createItalianChronologyFallback(
      chronologyCommand.command,
    );
    const digitalFallback = createItalianDigitalConductFallback(
      digitalCommand.command,
    );
    const domesticFallback = createItalianDomesticAffairsFallback(
      domesticCommand.command,
    );
    const socialFallback = createItalianSocialPlanningFallback(
      socialCommand.command,
    );
    expect(
      validateItalianChronologyLanguage(
        chronologyFallback,
        chronologyCommand.command,
      ),
    ).toEqual({ status: "valid", language: chronologyFallback });
    expect(
      validateItalianDigitalConductLanguage(
        digitalFallback,
        digitalCommand.command,
      ),
    ).toEqual({ status: "valid", language: digitalFallback });
    expect(
      validateItalianDomesticAffairsLanguage(
        domesticFallback,
        domesticCommand.command,
      ),
    ).toEqual({ status: "valid", language: domesticFallback });
    expect(
      validateItalianSocialPlanningLanguage(
        socialFallback,
        socialCommand.command,
      ),
    ).toEqual({ status: "valid", language: socialFallback });
  });

  it("rejects Italian coercion, surveillance, and invented numbers", () => {
    const filing: DigitalConductFiling = {
      locale: "it",
      department: "digital_conduct",
      respondent: "Luca",
      relationship: "friend",
      offence: "unacknowledged_coordination",
      facts: { responseHours: 18, followUpCount: 2 },
      impact: "coordination_delayed",
      mitigation: "usually_clear",
      statement: "Luca non ha dato riscontro.",
    };
    const result = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (result.status !== "valid")
      throw new Error("Italian command is required.");
    const fallback = createItalianDigitalConductFallback(result.command);
    const validation = validateItalianDigitalConductLanguage(
      {
        ...fallback,
        remedy: {
          ...fallback.remedy,
          instruction: {
            ...fallback.remedy.instruction,
            text: "Il destinatario deve rispondere entro 99 ore e attivare il monitoraggio.",
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

  it("uses concrete Italian wording for the container-remainder remedy", () => {
    const filing: DomesticAffairsFiling = {
      locale: "it",
      department: "domestic_affairs",
      respondent: "Luca",
      relationship: "roommate",
      offence: "token_remainder",
      facts: { remainingServings: 1, capacityServings: 8 },
      impact: "needed_item_unavailable",
      mitigation: "usually_restocks",
      statement: "Nel contenitore era rimasta una sola porzione.",
    };
    const result = createDomesticAffairsDeterminationLanguageCommand(
      filing,
      assessDomesticAffairsFiling(filing),
    );
    if (result.status !== "valid")
      throw new Error("Italian Domestic Affairs command is required.");
    const fallback = createItalianDomesticAffairsFallback(result.command);
    expect(fallback.remedy.title).toBe(
      "Protocollo per la gestione del residuo",
    );
    expect(fallback.remedy.instruction.text).toContain(
      "finire il contenuto del contenitore condiviso prima di riporlo",
    );
    expect(fallback.remedy.instruction.text).not.toContain(
      "completare il contenitore",
    );

    const validation = validateItalianDomesticAffairsLanguage(
      {
        ...fallback,
        remedy: {
          title: "Protocollo di completamento del contenitore",
          instruction: {
            ...fallback.remedy.instruction,
            text: "Per le prossime tre occasioni domestiche, il Bureau raccomanda di completare il contenitore condiviso.",
          },
        },
      },
      result.command,
    );
    expect(validation.status).toBe("invalid");
    if (validation.status === "invalid") {
      expect(validation.issues).toContain("non_compliant_remedy");
    }
  });

  it("keeps the Italian fallback and snapshot locale explicit end-to-end", async () => {
    const filing: ChronologyFiling = {
      locale: "it",
      department: "chronology",
      respondent: "Luca",
      relationship: "friend",
      offence: "chronic_lateness",
      facts: { agreedTime: "19:00", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Luca è arrivato dopo l'orario concordato.",
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
      language: { locale: "it" },
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
          locale: "it",
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
    ).toMatchObject({ status: "valid", snapshot: { locale: "it" } });
  });

  it("sends Italian editorial instructions and a redacted Italian command", async () => {
    const filing: DigitalConductFiling = {
      locale: "it",
      department: "digital_conduct",
      respondent: "Luca",
      relationship: "friend",
      offence: "fragmented_messages",
      facts: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
      impact: "notification_burden",
      mitigation: "provides_summary",
      statement: "Luca ha inviato i dettagli in molti messaggi.",
    };
    const command = createDigitalConductDeterminationLanguageCommand(
      filing,
      assessDigitalConductFiling(filing),
    );
    if (command.status !== "valid")
      throw new Error("Italian command required.");
    const language = createItalianDigitalConductFallback(command.command);
    const requests: unknown[] = [];
    const provider = new OpenAIDeterminationLanguageProvider((request) => {
      requests.push(request);
      return Promise.resolve({
        id: "resp_it",
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
    expect(serialized).toContain("Scrivi in italiano");
    expect(serialized).toContain("trascrizione d'ufficio");
    expect(serialized).toContain("requiredSemanticReference");
    expect(serialized).toContain('\\"locale\\":\\"it\\"');
    expect(serialized).not.toContain("Luca");
  });
});
