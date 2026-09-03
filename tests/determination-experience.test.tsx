import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  type IssuedChronologyDetermination,
  type IssuedDomesticAffairsDetermination,
} from "@/domain/determination/determination-experience";
import {
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptyDomesticAffairsDraft,
  validateDomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
import { createDomesticAffairsDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
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

function domesticDeterminationFixture() {
  const draft = {
    ...createEmptyDomesticAffairsDraft(),
    respondent: "Riley",
    relationship: "roommate" as const,
    offence: "misplaced_object" as const,
    facts: {
      ...createEmptyDomesticAffairsDraft().facts,
      misplacedObject: {
        itemCount: "4",
        distanceSteps: "8",
        correctionSeconds: "45",
      },
    },
    impact: "shared_space_obstructed" as const,
    mitigation: "handles_other_chores" as const,
    statement: "Four items waited beside their ordinary location.",
  };
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

    render(
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
