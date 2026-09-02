import { describe, expect, it } from "vitest";

import {
  GENERATION_IDEMPOTENCY_STORAGE_KEY,
  getOrCreateGenerationIdempotencyKey,
} from "@/features/access/generation-idempotency";

describe("browser generation idempotency", () => {
  it("reuses one valid key and replaces malformed storage", () => {
    window.sessionStorage.clear();
    const random = (bytes: Uint8Array) => bytes.fill(9);
    const first = getOrCreateGenerationIdempotencyKey(
      window.sessionStorage,
      random,
    );
    const second = getOrCreateGenerationIdempotencyKey(
      window.sessionStorage,
      () => new Uint8Array(16).fill(2),
    );
    expect(first).toMatch(/^fil_[A-Za-z0-9_-]{22}$/u);
    expect(second).toBe(first);

    window.sessionStorage.setItem(GENERATION_IDEMPOTENCY_STORAGE_KEY, "bad");
    expect(
      getOrCreateGenerationIdempotencyKey(window.sessionStorage, random),
    ).toBe(first);
  });
});
