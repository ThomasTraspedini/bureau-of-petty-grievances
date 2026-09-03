import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { assessDigitalConductFiling } from "@/domain/determination/digital-conduct-assessment";
import { assessDomesticAffairsFiling } from "@/domain/determination/domestic-affairs-assessment";
import {
  DETERMINATION_EXPERIENCE_VERSION,
  determinationPresentationVariant,
  type ChronologyDeterminationSnapshot,
  type DigitalConductDeterminationSnapshot,
  type DomesticAffairsDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import {
  createChronologyDeterminationLanguageCommand,
  createDigitalConductDeterminationLanguageCommand,
  createDomesticAffairsDeterminationLanguageCommand,
} from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import { createEnglishDigitalConductFallback } from "@/domain/determination/locales/en-digital-conduct";
import { createEnglishDomesticAffairsFallback } from "@/domain/determination/locales/en-domestic-affairs";
import {
  createEmptyChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptyDigitalConductDraft,
  validateDigitalConductDraft,
} from "@/domain/filing/digital-conduct";
import {
  createEmptyDomesticAffairsDraft,
  validateDomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
import type { PublicRecord } from "@/domain/public-record/public-record";
import { createPublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";
import { PublicRecordSharing } from "@/features/public-record/public-record-sharing";
import { localizePublicRecordShare } from "@/features/public-record/public-record-sharing-copy";
import { resolvePublicRecordOrigin } from "@/server/public-record/public-record-origin";
import messages from "../messages/en.json";

const publicUrl = "https://bureau.example/en/record/rec_AAAAAAAAAAAAAAAAAAAAAA";

afterEach(() => {
  vi.restoreAllMocks();
  defineNavigatorValue("share", undefined);
  defineNavigatorValue("clipboard", undefined);
});

describe("public-record sharing boundary", () => {
  it("derives only the approved non-identifying preview facts", () => {
    const descriptor = createPublicRecordShareDescriptor(recordFixture());
    expect(descriptor).toEqual({
      descriptorVersion: 3,
      department: "chronology",
      disposition: "upheld_with_circumstances_noted",
      reference: "CHR · 2026 · A1B2C3",
      offence: "premature_departure",
      discrepancyMinutes: 24,
      mitigation: "brings_dessert",
      presentationVariant: descriptor.presentationVariant,
    });
    const serialized = JSON.stringify(descriptor);
    expect(serialized).not.toContain("Marco");
    expect(serialized).not.toContain("Shoes were still being located");
    expect(serialized).not.toContain("19:30");
    expect(serialized).not.toContain("rec_");
    expect(serialized).not.toContain("owner");
  });

  it("shares only bounded Digital Conduct counts and excludes submitted communications", () => {
    const descriptor = createPublicRecordShareDescriptor({
      ...recordFixture(),
      snapshot: digitalDeterminationSnapshot(),
    });
    expect(descriptor).toEqual({
      descriptorVersion: 3,
      department: "digital_conduct",
      disposition: "upheld_with_circumstances_noted",
      reference: "DIG · 2026 · D4E5F6",
      offence: "fragmented_messages",
      evidence: { kind: "message_density", messageCount: 8, ideaCount: 2 },
      mitigation: "provides_summary",
      presentationVariant: descriptor.presentationVariant,
    });
    const serialized = JSON.stringify(descriptor);
    expect(serialized).not.toContain("Alex");
    expect(serialized).not.toContain("dinner plan");
    expect(serialized).not.toContain("notifications");
    expect(serialized).not.toContain("burstMinutes");
  });

  it("shares only approved Domestic Affairs measures and excludes private household context", () => {
    const descriptor = createPublicRecordShareDescriptor({
      ...recordFixture(),
      snapshot: domesticDeterminationSnapshot(),
    });
    expect(descriptor).toEqual({
      descriptorVersion: 3,
      department: "domestic_affairs",
      disposition: "upheld_with_circumstances_noted",
      reference: "DOM · 2026 · H0M3A1",
      offence: "misplaced_object",
      evidence: { kind: "correction_path", itemCount: 4, distanceSteps: 8 },
      mitigation: "handles_other_chores",
      presentationVariant: descriptor.presentationVariant,
    });
    const serialized = JSON.stringify(descriptor);
    expect(serialized).not.toContain("Riley");
    expect(serialized).not.toContain("hallway");
    expect(serialized).not.toContain("correctionSeconds");
    expect(serialized).not.toContain("address");
  });

  it("localizes a bounded metadata and share payload", () => {
    const localized = localizedFixture();
    expect(localized.metadataTitle).toBe(
      "Premature departure — Bureau of Petty Grievances",
    );
    expect(localized.summary).toBe(
      "A 24-minute discrepancy. Mitigation entered: dessert is usually brought.",
    );
    expect(JSON.stringify(localized)).not.toContain("Marco");
    expect(JSON.stringify(localized)).not.toContain("Shoes");
  });

  it("uses native sharing with the public URL and no owner fragment", async () => {
    const share = vi.fn<Navigator["share"]>().mockResolvedValue(undefined);
    defineNavigatorValue("share", share);
    renderSharing();

    fireEvent.click(
      screen.getByRole("button", { name: messages.Sharing.shareAction }),
    );
    await waitFor(() => {
      expect(share).toHaveBeenCalledOnce();
    });
    const [payload] = share.mock.calls[0] ?? [];
    expect(payload).toEqual({
      title: "Bureau determination · CHR · 2026 · A1B2C3",
      text: localizedFixture().shareText,
      url: publicUrl,
    });
    expect(JSON.stringify(share.mock.calls)).not.toContain("owner=");
    expect(screen.getByText(messages.Sharing.sharedStatus)).toBeVisible();
  });

  it("adds bounded share attribution without changing the displayed public address", async () => {
    const share = vi.fn<Navigator["share"]>().mockResolvedValue(undefined);
    defineNavigatorValue("share", share);
    renderSharing(`sub_${"s".repeat(22)}`);

    fireEvent.click(
      screen.getByRole("button", { name: messages.Sharing.shareAction }),
    );
    await waitFor(() => {
      expect(share).toHaveBeenCalledOnce();
    });
    expect(share.mock.calls[0]?.[0]?.url).toBe(`${publicUrl}?via=share`);
    expect(
      screen.getByLabelText(messages.Sharing.publicAddressLabel),
    ).toHaveValue(publicUrl);
  });

  it("falls back to copying when native sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    defineNavigatorValue("clipboard", { writeText });
    renderSharing();

    fireEvent.click(
      screen.getByRole("button", { name: messages.Sharing.shareAction }),
    );
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(publicUrl);
    });
    expect(screen.getByText(messages.Sharing.copiedStatus)).toBeVisible();
  });

  it("falls back to copying after a non-cancellation share failure", async () => {
    const share = vi
      .fn<Navigator["share"]>()
      .mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    defineNavigatorValue("share", share);
    defineNavigatorValue("clipboard", { writeText });
    renderSharing();

    fireEvent.click(
      screen.getByRole("button", { name: messages.Sharing.shareAction }),
    );
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(publicUrl);
    });
    expect(screen.getByText(messages.Sharing.copiedStatus)).toBeVisible();
  });

  it("preserves cancellation and exposes a selectable address on copy failure", async () => {
    const share = vi
      .fn<Navigator["share"]>()
      .mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    defineNavigatorValue("share", share);
    defineNavigatorValue("clipboard", { writeText });
    renderSharing();

    fireEvent.click(
      screen.getByRole("button", { name: messages.Sharing.shareAction }),
    );
    expect(
      await screen.findByText(messages.Sharing.shareCancelledStatus),
    ).toBeVisible();
    expect(writeText).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: messages.Sharing.copyAction }),
    );
    const address = screen.getByLabelText(messages.Sharing.publicAddressLabel);
    expect(
      await screen.findByText(messages.Sharing.manualStatus),
    ).toBeVisible();
    expect(address).toHaveFocus();
    expect(address).toHaveValue(publicUrl);
  });
});

describe("canonical public-record origin", () => {
  it("requires explicit configuration in production and defaults locally", () => {
    expect(resolvePublicRecordOrigin(undefined, "production")).toEqual({
      status: "missing",
    });
    expect(resolvePublicRecordOrigin(undefined, "development")).toEqual({
      status: "valid",
      origin: "http://localhost:3000",
    });
  });

  it("accepts a bare HTTPS origin and local HTTP only", () => {
    expect(
      resolvePublicRecordOrigin("https://records.example/", "production"),
    ).toEqual({ status: "valid", origin: "https://records.example" });
    expect(
      resolvePublicRecordOrigin("http://127.0.0.1:4173", "production"),
    ).toEqual({ status: "valid", origin: "http://127.0.0.1:4173" });
    for (const invalid of [
      "http://records.example",
      "https://records.example/path",
      "https://user:secret@records.example",
      "https://records.example?origin=other",
      "not-an-origin",
    ]) {
      expect(resolvePublicRecordOrigin(invalid, "production")).toEqual({
        status: "invalid",
      });
    }
  });
});

function renderSharing(analyticsSubject?: `sub_${string}`) {
  const record = recordFixture();
  const descriptor = createPublicRecordShareDescriptor(record);
  render(
    <PublicRecordSharing
      descriptor={descriptor}
      localized={localizePublicRecordShare(descriptor, "en", messages.Sharing)}
      publicUrl={publicUrl}
      copy={messages.Sharing}
      {...(analyticsSubject ? { analyticsSubject } : {})}
    />,
  );
}

function localizedFixture() {
  const descriptor = createPublicRecordShareDescriptor(recordFixture());
  return localizePublicRecordShare(descriptor, "en", messages.Sharing);
}

function recordFixture(): PublicRecord {
  return {
    snapshotVersion: 1,
    publicId: `rec_${"A".repeat(22)}`,
    status: "published",
    publishedAt: "2026-09-02T12:05:00.000Z",
    expiresAt: "2027-03-01T12:05:00.000Z",
    updatedAt: "2026-09-02T12:05:00.000Z",
    snapshot: determinationSnapshot(),
  };
}

function determinationSnapshot(): ChronologyDeterminationSnapshot {
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
  const validation = validateChronologyDraft(draft, "en");
  if (validation.status === "invalid") throw new Error("Invalid fixture.");
  const assessment = assessChronologyFiling(validation.filing);
  const command = createChronologyDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid command.");
  const reference = "CHR · 2026 · A1B2C3";
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference,
    issuedAt: "2026-09-02T12:00:00.000Z",
    filing: validation.filing,
    assessment,
    language: createEnglishChronologyFallback(command.command),
    presentationVariant: determinationPresentationVariant(
      reference,
      assessment.presentation.visualSeed,
    ),
  };
}

function digitalDeterminationSnapshot(): DigitalConductDeterminationSnapshot {
  const draft = {
    ...createEmptyDigitalConductDraft(),
    respondent: "Alex",
    relationship: "friend" as const,
    offence: "fragmented_messages" as const,
    facts: {
      ...createEmptyDigitalConductDraft().facts,
      fragmentedMessages: {
        messageCount: "8",
        ideaCount: "2",
        burstMinutes: "6",
      },
    },
    impact: "notification_burden" as const,
    mitigation: "provides_summary" as const,
    statement: "The dinner plan arrived through eight separate notifications.",
  };
  const validation = validateDigitalConductDraft(draft, "en");
  if (validation.status === "invalid") throw new Error("Invalid fixture.");
  const assessment = assessDigitalConductFiling(validation.filing);
  const command = createDigitalConductDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid command.");
  const reference = "DIG · 2026 · D4E5F6";
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference,
    issuedAt: "2026-09-02T12:00:00.000Z",
    filing: validation.filing,
    assessment,
    language: createEnglishDigitalConductFallback(command.command),
    presentationVariant: determinationPresentationVariant(
      reference,
      assessment.presentation.visualSeed,
    ),
  };
}

function domesticDeterminationSnapshot(): DomesticAffairsDeterminationSnapshot {
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
    statement: "Four items waited in the hallway beside their usual place.",
  };
  const validation = validateDomesticAffairsDraft(draft, "en");
  if (validation.status === "invalid") throw new Error("Invalid fixture.");
  const assessment = assessDomesticAffairsFiling(validation.filing);
  const command = createDomesticAffairsDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") throw new Error("Invalid command.");
  const reference = "DOM · 2026 · H0M3A1";
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: "en",
    reference,
    issuedAt: "2026-09-02T12:00:00.000Z",
    filing: validation.filing,
    assessment,
    language: createEnglishDomesticAffairsFallback(command.command),
    presentationVariant: determinationPresentationVariant(
      reference,
      assessment.presentation.visualSeed,
    ),
  };
}

function defineNavigatorValue(property: string, value: unknown) {
  Object.defineProperty(window.navigator, property, {
    configurable: true,
    value,
  });
}
