import { describe, expect, it } from "vitest";

import {
  GENERATION_IDEMPOTENCY_STORAGE_KEY,
  generationIdempotencyStorageKey,
  getOrCreateGenerationIdempotencyKey,
} from "@/features/access/generation-idempotency";

describe("browser generation idempotency", () => {
  it("reuses one valid key and replaces malformed storage", () => {
    window.sessionStorage.clear();
    const random = (bytes: Uint8Array) => bytes.fill(9);
    const first = getOrCreateGenerationIdempotencyKey(
      window.sessionStorage,
      GENERATION_IDEMPOTENCY_STORAGE_KEY,
      random,
    );
    const second = getOrCreateGenerationIdempotencyKey(
      window.sessionStorage,
      GENERATION_IDEMPOTENCY_STORAGE_KEY,
      () => new Uint8Array(16).fill(2),
    );
    expect(first).toMatch(/^fil_[A-Za-z0-9_-]{22}$/u);
    expect(second).toBe(first);

    window.sessionStorage.setItem(GENERATION_IDEMPOTENCY_STORAGE_KEY, "bad");
    expect(
      getOrCreateGenerationIdempotencyKey(
        window.sessionStorage,
        GENERATION_IDEMPOTENCY_STORAGE_KEY,
        random,
      ),
    ).toBe(first);
  });

  it("isolates pending generation keys by locale and department", () => {
    const italianChronology = generationIdempotencyStorageKey(
      "it",
      "chronology",
    );
    const frenchDigital = generationIdempotencyStorageKey(
      "fr",
      "digital_conduct",
    );

    expect(italianChronology).not.toBe(frenchDigital);
    expect(italianChronology).toContain(":chronology:it:");
    expect(frenchDigital).toContain(":digital_conduct:fr:");
  });
});
