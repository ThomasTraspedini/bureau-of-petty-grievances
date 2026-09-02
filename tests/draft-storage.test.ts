import { describe, expect, it } from "vitest";

import { createEmptyChronologyDraft } from "@/domain/filing/chronology";
import {
  FILING_DRAFT_LIFETIME_MS,
  parseStoredDraft,
  serializeDraft,
} from "@/features/filing/draft-storage";

describe("device-local filing drafts", () => {
  it("restores a valid versioned draft within 30 days", () => {
    const now = Date.UTC(2026, 8, 2);
    const draft = { ...createEmptyChronologyDraft(), respondent: "Marco" };
    expect(parseStoredDraft(serializeDraft(draft, now), now + 1_000)).toEqual({
      status: "restored",
      draft,
    });
  });

  it("expires old drafts and rejects malformed envelopes", () => {
    const now = Date.UTC(2026, 8, 2);
    const serialized = serializeDraft(createEmptyChronologyDraft(), now);
    expect(
      parseStoredDraft(serialized, now + FILING_DRAFT_LIFETIME_MS + 1).status,
    ).toBe("expired");
    expect(parseStoredDraft('{"version":2}', now).status).toBe("invalid");
  });

  it("never serializes rejected witness text while preserving safe fields", () => {
    const draft = {
      ...createEmptyChronologyDraft(),
      respondent: "Marco",
      statement: "This describes abuse.",
    };
    const parsed = parseStoredDraft(serializeDraft(draft, 100), 101);
    expect(parsed).toMatchObject({
      status: "restored",
      draft: { respondent: "Marco", statement: "" },
    });
  });

  it("rejects tampered language-neutral selections", () => {
    const value = serializeDraft(createEmptyChronologyDraft(), 100).replace(
      '"relationship":""',
      '"relationship":"unknown"',
    );
    expect(parseStoredDraft(value, 101).status).toBe("invalid");
  });

  it("bounds restored fact fields", () => {
    const oversized = serializeDraft(createEmptyChronologyDraft(), 100).replace(
      '"declaredTime":""',
      `"declaredTime":"${"1".repeat(100)}"`,
    );
    expect(parseStoredDraft(oversized, 101).status).toBe("invalid");
  });
});
