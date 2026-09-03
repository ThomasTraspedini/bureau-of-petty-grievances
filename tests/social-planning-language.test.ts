import { describe, expect, it } from "vitest";

import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import { createSocialPlanningDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import {
  createEnglishSocialPlanningFallback,
  validateEnglishSocialPlanningLanguage,
} from "@/domain/determination/locales/en-social-planning";
import type { SocialPlanningFiling } from "@/domain/filing/social-planning";

function filings(): readonly SocialPlanningFiling[] {
  const common = {
    locale: "en" as const,
    department: "social_planning" as const,
    respondent: "Sam",
    relationship: "friend" as const,
    impact: "participants_waiting" as const,
    mitigation: "usually_flexible" as const,
    statement: "Sam returned the dinner shortlist for another round.",
  };
  return [
    {
      ...common,
      offence: "option_veto_cycle",
      facts: {
        proposedOptionCount: 6,
        rejectedOptionCount: 5,
        alternativeOptionCount: 1,
      },
    },
    {
      ...common,
      offence: "decision_drift",
      facts: { decisionRoundCount: 5, elapsedHours: 72, participantCount: 4 },
    },
    {
      ...common,
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 2, participantCount: 5, noticeHours: 8 },
    },
  ];
}

describe("English Social Planning determination language", () => {
  it("provides a valid grounded fallback for every classification", () => {
    for (const filing of filings()) {
      const result = createSocialPlanningDeterminationLanguageCommand(
        filing,
        assessSocialPlanningFiling(filing),
      );
      expect(result.status).toBe("valid");
      if (result.status === "valid") {
        const fallback = createEnglishSocialPlanningFallback(result.command);
        expect(
          validateEnglishSocialPlanningLanguage(fallback, result.command),
        ).toEqual({ status: "valid", language: fallback });
        expect(JSON.stringify(result.command)).not.toContain("Sam");
      }
    }
  });

  it("uses singular English units for one alternative, revision, or hour", () => {
    const optionFiling = filings()[0];
    if (!optionFiling)
      throw new Error("Social Planning filing fixture missing.");
    const optionCommand = createSocialPlanningDeterminationLanguageCommand(
      optionFiling,
      assessSocialPlanningFiling(optionFiling),
    );
    if (optionCommand.status === "invalid") throw new Error("Invalid command.");
    expect(
      createEnglishSocialPlanningFallback(optionCommand.command).allegation
        .text,
    ).toContain("1 alternative was offered");

    const revisionFiling: SocialPlanningFiling = {
      ...optionFiling,
      offence: "confirmed_plan_revision",
      facts: { revisionCount: 1, participantCount: 2, noticeHours: 1 },
    };
    const revisionCommand = createSocialPlanningDeterminationLanguageCommand(
      revisionFiling,
      assessSocialPlanningFiling(revisionFiling),
    );
    if (revisionCommand.status === "invalid")
      throw new Error("Invalid command.");
    expect(
      createEnglishSocialPlanningFallback(revisionCommand.command).allegation
        .text,
    ).toContain("1 post-confirmation revision");
    expect(
      createEnglishSocialPlanningFallback(revisionCommand.command).allegation
        .text,
    ).toContain("1 hour of notice");
  });

  it("rejects social surveillance, compelled attendance, and invented facts", () => {
    const filing = filings()[0];
    if (!filing) throw new Error("Social Planning filing fixture missing.");
    const result = createSocialPlanningDeterminationLanguageCommand(
      filing,
      assessSocialPlanningFiling(filing),
    );
    if (result.status === "invalid") throw new Error("Invalid command.");
    const fallback = createEnglishSocialPlanningFallback(result.command);
    const unsafe = {
      ...fallback,
      remedy: {
        ...fallback.remedy,
        instruction: {
          ...fallback.remedy.instruction,
          text: "The respondent must share a calendar and attend every plan.",
        },
      },
    };
    const validation = validateEnglishSocialPlanningLanguage(
      unsafe,
      result.command,
    );
    expect(validation.status).toBe("invalid");
    if (validation.status === "invalid") {
      expect(validation.issues).toContain("prohibited_claim");
      expect(validation.issues).toContain("non_compliant_remedy");
    }
  });
});
