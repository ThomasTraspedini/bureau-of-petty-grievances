import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import { assessSocialPlanningFiling } from "@/domain/determination/social-planning-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  type IssuedChronologyDetermination,
  type IssuedDomesticAffairsDetermination,
  type IssuedSocialPlanningDetermination,
} from "@/domain/determination/determination-experience";
import {
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptyDomesticAffairsDraft,
  type DomesticAffairsOffenceCode,
  validateDomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
import {
  createEmptySocialPlanningDraft,
  validateSocialPlanningDraft,
} from "@/domain/filing/social-planning";
import { createDomesticAffairsDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
import { createSocialPlanningDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishSocialPlanningFallback } from "@/domain/determination/locales/en-social-planning";
import { DeterminationExperience } from "@/features/determination/determination-experience";
import {
  DETERMINATION_SESSION_KEY,
  parseDeterminationSession,
  serializeDeterminationSession,
} from "@/features/determination/determination-session";
import { PublicRecordExperience } from "@/features/public-record/public-record-experience";
import { pseudoLocalizeCatalog } from "@/i18n/pseudo";
import messages from "../messages/en.json";
import { CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES } from "./fixtures/chronology-determination-language";

function determinationFixture() {
  const draft = {
    ...createEmptyChronologyDraft(),
    respondent: "Marco",
    relationship: "friend" as const,
    offence: "premature_departure" as const,
    facts: {
      ...createEmptyChronologyDraft().facts,
      prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    },
    impact: "table_held" as const,
    mitigation: "brings_dessert" as const,
    statement: "Shoes were still being located.",
  };
  const validated = validateChronologyDraft(draft, "en");
  const fixture = CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES[0];
  if (validated.status === "invalid" || !fixture) {
    throw new Error("Determination experience fixtures must remain valid.");
  }
  const determination: IssuedChronologyDetermination = {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "CHR · 2026 · A1B2C3",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment: assessChronologyFiling(validated.filing),
    language: fixture.language,
  };
  return { draft, determination };
}

function domesticDeterminationFixture(
  offence: DomesticAffairsOffenceCode = "misplaced_object",
) {
  const draft = createEmptyDomesticAffairsDraft();
  draft.respondent = "Riley";
  draft.relationship = "roommate";
  draft.offence = offence;
  draft.impact = "shared_space_obstructed";
  draft.mitigation = "handles_other_chores";
  draft.statement = "The household condition remained unresolved.";
  if (offence === "token_remainder") {
    draft.facts.tokenRemainder = {
      remainingServings: "1",
      capacityServings: "8",
    };
  } else if (offence === "misplaced_object") {
    draft.facts.misplacedObject = {
      itemCount: "4",
      distanceSteps: "8",
      correctionSeconds: "45",
    };
  } else {
    draft.facts.emptyPackaging = {
      emptyPackageCount: "4",
      recurrencesInThirtyDays: "6",
    };
  }
  const validated = validateDomesticAffairsDraft(draft, "en");
  if (validated.status === "invalid") throw new Error("Invalid fixture.");
  const assessment = assessDomesticAffairsFiling(validated.filing);
  const command = createDomesticAffairsDeterminationLanguageCommand(
    validated.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid command.");
  const determination: IssuedDomesticAffairsDetermination = {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "DOM · 2026 · H0M3A1",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment,
    language: createEnglishDomesticAffairsFallback(command.command),
  };
  return { draft, determination };
}

function socialDeterminationFixture() {
  const draft = {
    ...createEmptySocialPlanningDraft(),
    respondent: "Taylor",
    relationship: "friend" as const,
    offence: "decision_drift" as const,
    facts: {
      ...createEmptySocialPlanningDraft().facts,
      decisionDrift: {
        decisionRoundCount: "5",
        elapsedHours: "72",
        participantCount: "4",
      },
    },
    impact: "participants_waiting" as const,
    mitigation: "usually_flexible" as const,
    statement: "The dinner date remained open through five planning rounds.",
  };
  const validated = validateSocialPlanningDraft(draft, "en");
  if (validated.status === "invalid") throw new Error("Invalid fixture.");
  const assessment = assessSocialPlanningFiling(validated.filing);
  const command = createSocialPlanningDeterminationLanguageCommand(
    validated.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid command.");
  const determination: IssuedSocialPlanningDetermination = {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference: "SOC · 2026 · P1A2N3",
    issuedAt: "2026-09-02T12:00:00.000Z",
    assessment,
    language: createEnglishSocialPlanningFallback(command.command),
  };
  return { draft, determination };
}

describe("determination experience", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders procedural identity, reconstructed facts, reasons, and remedy", async () => {
    const fixture = determinationFixture();
    window.sessionStorage.setItem(
      DETERMINATION_SESSION_KEY,
      serializeDeterminationSession(
        fixture.draft,
        fixture.determination,
        Date.now(),
      ),
    );

    const { container } = render(
      <DeterminationExperience
        locale="en"
        copy={messages.Determination}
        navigation={messages.Navigation}
        publicRecord={messages.PublicRecord}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Review concerning Marco" }),
    ).toBeVisible();
    expect(screen.getByText("CHR · 2026 · A1B2C3")).toBeVisible();
    expect(screen.getByText("7:30 PM")).toBeVisible();
    expect(screen.getByText("24 minutes later")).toBeVisible();
    expect(
      screen.getByText(fixture.determination.language.finding.text),
    ).toBeVisible();
    expect(screen.getByText("Departure language protocol")).toBeVisible();
    expect(
      screen.getByText(messages.Determination.transientBody),
    ).toBeVisible();
    const remedyStamp =
      container.querySelector<HTMLImageElement>(".remedy-stamp");
    expect(remedyStamp).toBeInTheDocument();
    expect(remedyStamp?.getAttribute("src")).toContain("stamp");
  });

  it("keeps stamp placement through reload and public viewing of an existing snapshot", async () => {
    const fixture = determinationFixture();
    const now = Date.now();
    const serialized = serializeDeterminationSession(
      fixture.draft,
      fixture.determination,
      now,
    );
    window.sessionStorage.setItem(DETERMINATION_SESSION_KEY, serialized);
    const privateView = (
      <DeterminationExperience
        locale="en"
        copy={messages.Determination}
        navigation={messages.Navigation}
        publicRecord={messages.PublicRecord}
      />
    );
    const first = render(privateView);
    await screen.findByRole("heading", { name: "Review concerning Marco" });
    const placement =
      first.container.querySelector<HTMLElement>(".remedy-stamp")?.style
        .transform;
    expect(placement).toMatch(/translate\(.+\) rotate\(.+deg\)/);
    first.unmount();
    const reload = render(privateView);
    await screen.findByRole("heading", { name: "Review concerning Marco" });
    expect(
      reload.container.querySelector<HTMLElement>(".remedy-stamp")?.style
        .transform,
    ).toBe(placement);
    reload.unmount();

    const restored = parseDeterminationSession(serialized, now);
    if (restored.status !== "restored")
      throw new Error("Snapshot must restore");
    const publicView = render(
      <PublicRecordExperience
        locale="en"
        publicUrl="https://bureau.example/en/record/example"
        messages={messages}
        consultationAggregate={null}
        record={{
          snapshotVersion: 1,
          publicId: `rec_${"A".repeat(22)}`,
          status: "published",
          publishedAt: "2026-09-02T12:05:00.000Z",
          expiresAt: "2027-03-01T12:05:00.000Z",
          updatedAt: "2026-09-02T12:05:00.000Z",
          snapshot: restored.snapshot,
        }}
      />,
    );
    expect(
      publicView.container.querySelector<HTMLElement>(".remedy-stamp")?.style
        .transform,
    ).toBe(placement);
  });

  it("renders expanded pseudo-localized interface copy", async () => {
    const fixture = determinationFixture();
    const pseudo = pseudoLocalizeCatalog(messages);
    window.sessionStorage.setItem(
      DETERMINATION_SESSION_KEY,
      serializeDeterminationSession(
        fixture.draft,
        fixture.determination,
        Date.now(),
      ),
    );

    render(
      <DeterminationExperience
        locale="en"
        copy={pseudo.Determination}
        navigation={pseudo.Navigation}
        publicRecord={pseudo.PublicRecord}
      />,
    );

    expect(
      await screen.findByText(pseudo.Determination.chronologyBody),
    ).toBeVisible();
    expect(screen.getByText(pseudo.Determination.transientBody)).toBeVisible();
  });

  it("shows evaluator-only language provenance and comparison", async () => {
    const fixture = determinationFixture();
    window.sessionStorage.setItem(
      DETERMINATION_SESSION_KEY,
      serializeDeterminationSession(
        fixture.draft,
        fixture.determination,
        Date.now(),
        {
          source: "personalized",
          standardLanguage: fixture.determination.language,
        },
      ),
    );

    render(
      <DeterminationExperience
        locale="en"
        copy={messages.Determination}
        navigation={messages.Navigation}
        publicRecord={messages.PublicRecord}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: messages.Determination.evaluationPersonalizedTitle,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(messages.Determination.evaluationCompareAction),
    ).toBeVisible();
  });

  it("renders the Domestic Affairs register with its no-access boundary", async () => {
    const fixture = domesticDeterminationFixture();
    window.sessionStorage.setItem(
      DETERMINATION_SESSION_KEY,
      serializeDeterminationSession(
        fixture.draft,
        fixture.determination,
        Date.now(),
      ),
    );
    render(
      <DeterminationExperience
        locale="en"
        copy={messages.Determination}
        navigation={messages.Navigation}
        publicRecord={messages.PublicRecord}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: messages.Determination.domesticReconstructionTitle,
      }),
    ).toBeVisible();
    expect(screen.getByText("8 steps")).toBeVisible();
    expect(screen.getByText("45 seconds")).toBeVisible();
    expect(
      screen.getByText(messages.Determination.domesticReconstructionBody),
    ).toBeVisible();
  });

  it.each([
    ["token_remainder", 1],
    ["misplaced_object", 0],
    ["empty_packaging", 0],
  ] as const)(
    "renders facts and only a proportional container graphic for %s",
    async (offence, gauges) => {
      const fixture = domesticDeterminationFixture(offence);
      window.sessionStorage.setItem(
        DETERMINATION_SESSION_KEY,
        serializeDeterminationSession(
          fixture.draft,
          fixture.determination,
          Date.now(),
        ),
      );

      const { container } = render(
        <DeterminationExperience
          locale="en"
          copy={messages.Determination}
          navigation={messages.Navigation}
          publicRecord={messages.PublicRecord}
        />,
      );

      expect(
        await screen.findByRole("heading", {
          name: messages.Determination.domesticReconstructionTitle,
        }),
      ).toBeVisible();
      const diagram = container.querySelector(".domestic-register");
      expect(diagram).toBeInTheDocument();
      expect(
        diagram?.querySelectorAll(".domestic-container-gauge"),
      ).toHaveLength(gauges);
      expect(
        diagram?.querySelectorAll(".domestic-correction-path"),
      ).toHaveLength(0);
      expect(diagram?.querySelectorAll(".domestic-inventory")).toHaveLength(0);
      if (offence === "token_remainder") {
        expect(screen.getByText("1 serving")).toBeVisible();
        expect(screen.getByText("8 servings")).toBeVisible();
        const fills = diagram?.querySelectorAll<HTMLElement>(
          ".domestic-container-gauge i",
        );
        expect(fills?.[0]?.style.height).toBe("12.5%");
        expect(fills).toHaveLength(1);
      }
    },
  );

  it("renders the Social Planning register with its no-access boundary", async () => {
    const fixture = socialDeterminationFixture();
    window.sessionStorage.setItem(
      DETERMINATION_SESSION_KEY,
      serializeDeterminationSession(
        fixture.draft,
        fixture.determination,
        Date.now(),
      ),
    );
    render(
      <DeterminationExperience
        locale="en"
        copy={messages.Determination}
        navigation={messages.Navigation}
        publicRecord={messages.PublicRecord}
      />,
    );
    expect(
      await screen.findByRole("heading", {
        name: messages.Determination.socialReconstructionTitle,
      }),
    ).toBeVisible();
    const register = screen.getByRole("region", {
      name: messages.Determination.socialReconstructionTitle,
    });
    expect(
      within(register).getAllByRole("term").map((node) => node.textContent),
    ).toEqual([
      messages.Determination.socialRoundsLabel,
      messages.Determination.socialElapsedLabel,
      messages.Determination.socialParticipantsLabel,
      messages.Determination.socialSourceLabel,
    ]);
    expect(
      within(register).getAllByRole("definition").map((node) => node.textContent),
    ).toEqual(["5", "72 hours", "4", messages.Determination.socialSourceValue]);
    expect(
      screen.getByText(messages.Determination.socialReconstructionBody),
    ).toBeVisible();
  });

  it("renders a public localized snapshot and expanded reporting controls", () => {
    const fixture = determinationFixture();
    const now = Date.parse("2026-09-02T12:05:00.000Z");
    const restored = parseDeterminationSession(
      serializeDeterminationSession(fixture.draft, fixture.determination, now),
      now,
    );
    if (restored.status !== "restored") {
      throw new Error("The public-record component fixture must restore.");
    }
    const pseudo = pseudoLocalizeCatalog(messages);
    render(
      <PublicRecordExperience
        locale="en"
        publicUrl={`https://bureau.example/en/record/rec_${"A".repeat(22)}`}
        messages={pseudo}
        consultationAggregate={{
          total: 0,
          counts: {
            grievanceUpheld: 0,
            grievanceDismissed: 0,
            upheldWithCircumstancesNoted: 0,
          },
        }}
        record={{
          snapshotVersion: 1,
          publicId: `rec_${"A".repeat(22)}`,
          status: "published",
          publishedAt: "2026-09-02T12:05:00.000Z",
          expiresAt: "2027-03-01T12:05:00.000Z",
          updatedAt: "2026-09-02T12:05:00.000Z",
          snapshot: restored.snapshot,
        }}
      />,
    );
    expect(screen.getByText(pseudo.PublicRecord.sessionLabel)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: pseudo.Sharing.panelTitle }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: pseudo.PublicRecord.reportTitle }),
    ).toBeVisible();
    expect(screen.getByText(pseudo.PublicRecord.reportBody)).toBeVisible();
  });
});
