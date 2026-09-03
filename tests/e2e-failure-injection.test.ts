import { afterEach, describe, expect, it, vi } from "vitest";

import {
  consumeE2eFailureInstruction,
  E2E_FAILURE_INSTRUCTION_HEADER,
} from "@/server/testing/e2e-failure-injection";

function instructionHeaders(value: string): Headers {
  return new Headers({ [E2E_FAILURE_INSTRUCTION_HEADER]: value });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("E2E failure injection", () => {
  it("stays inert without the dedicated test-server guard", () => {
    vi.stubEnv("BUREAU_E2E_FAILURE_INJECTION", "0");

    expect(
      consumeE2eFailureInstruction(
        instructionHeaders("complete_filing:guard-disabled"),
        "complete_filing",
      ),
    ).toBe(false);
  });

  it("rejects malformed, unknown, and mismatched instructions", () => {
    vi.stubEnv("BUREAU_E2E_FAILURE_INJECTION", "1");

    expect(
      consumeE2eFailureInstruction(
        instructionHeaders("unknown:unknown-point"),
        "complete_filing",
      ),
    ).toBe(false);
    expect(
      consumeE2eFailureInstruction(
        instructionHeaders("complete_filing:short"),
        "complete_filing",
      ),
    ).toBe(false);
    expect(
      consumeE2eFailureInstruction(
        instructionHeaders("publish_public_record:mismatched-point"),
        "complete_filing",
      ),
    ).toBe(false);
  });

  it("consumes one exact instruction only once", () => {
    vi.stubEnv("BUREAU_E2E_FAILURE_INJECTION", "1");
    const requestHeaders = instructionHeaders(
      "submit_public_consultation:single-consumption",
    );

    expect(
      consumeE2eFailureInstruction(
        requestHeaders,
        "submit_public_consultation",
      ),
    ).toBe(true);
    expect(
      consumeE2eFailureInstruction(
        requestHeaders,
        "submit_public_consultation",
      ),
    ).toBe(false);
  });
});
