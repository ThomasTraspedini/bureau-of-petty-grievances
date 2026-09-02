import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  type IssuedChronologyDetermination,
} from "@/domain/determination/determination-experience";
import {
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import { DeterminationExperience } from "@/features/determination/determination-experience";
import {
  DETERMINATION_SESSION_KEY,
  serializeDeterminationSession,
} from "@/features/determination/determination-session";
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
      />,
    );

    expect(
      await screen.findByText(pseudo.Determination.chronologyBody),
    ).toBeVisible();
    expect(screen.getByText(pseudo.Determination.transientBody)).toBeVisible();
  });
});
