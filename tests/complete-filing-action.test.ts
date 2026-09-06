import { describe, expect, it, vi } from "vitest";

import {
  type ChronologyDraft,
  createEmptyChronologyDraft,
} from "@/domain/filing/chronology";
import {
  createEmptyDigitalConductDraft,
  type DigitalConductDraft,
} from "@/domain/filing/digital-conduct";
import {
  createEmptyDomesticAffairsDraft,
  type DomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
import {
  createEmptySocialPlanningDraft,
  type SocialPlanningDraft,
} from "@/domain/filing/social-planning";
import { createUnavailableDeterminationLanguageProvider } from "@/providers/determination-language-provider";
import { completeFilingReviewWith } from "@/server/determination/complete-filing-review";
import { completeFilingReviewControlledWith } from "@/server/determination/complete-filing-review";
import type { AccessControlRepository } from "@/server/access/access-control-repository";
import { CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES } from "./fixtures/chronology-determination-language";

function completeDraft(): ChronologyDraft {
  return {
    ...createEmptyChronologyDraft(),
    respondent: "Marco",
    relationship: "friend",
    offence: "premature_departure",
    facts: {
      ...createEmptyChronologyDraft().facts,
      prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    },
    impact: "table_held",
    mitigation: "brings_dessert",
    statement: "Shoes were still being located.",
  };
}

function completeDigitalDraft(): DigitalConductDraft {
  return {
    ...createEmptyDigitalConductDraft(),
    respondent: "Alex",
    relationship: "friend",
    offence: "fragmented_messages",
    facts: {
      ...createEmptyDigitalConductDraft().facts,
      fragmentedMessages: {
        messageCount: "8",
        ideaCount: "2",
        burstMinutes: "6",
      },
    },
    impact: "notification_burden",
    mitigation: "provides_summary",
    statement: "The dinner plan arrived through eight separate notifications.",
  };
}

function completeDomesticDraft(): DomesticAffairsDraft {
  return {
    ...createEmptyDomesticAffairsDraft(),
    respondent: "Riley",
    relationship: "roommate",
    offence: "empty_packaging",
    facts: {
      ...createEmptyDomesticAffairsDraft().facts,
      emptyPackaging: {
        emptyPackageCount: "2",
        recurrencesInThirtyDays: "6",
      },
    },
    impact: "false_stock_signal",
    mitigation: "handles_other_chores",
    statement: "The empty carton returned to the shared shelf twice this week.",
  };
}

function completeSocialDraft(): SocialPlanningDraft {
  return {
    ...createEmptySocialPlanningDraft(),
    respondent: "Taylor",
    relationship: "friend",
    offence: "decision_drift",
    facts: {
      ...createEmptySocialPlanningDraft().facts,
      decisionDrift: {
        decisionRoundCount: "5",
        elapsedHours: "72",
        participantCount: "4",
      },
    },
    impact: "participants_waiting",
    mitigation: "usually_flexible",
    statement: "The dinner date remained open through five planning rounds.",
  };
}

const dependencies = {
  provider: createUnavailableDeterminationLanguageProvider(),
  now: () => new Date("2026-09-02T12:00:00.000Z"),
  randomReferencePart: () => "A1B2C3",
};

describe("complete filing server boundary", () => {
  it("issues a fallback-backed determination after runtime validation", async () => {
    await expect(
      completeFilingReviewWith("en", completeDraft(), dependencies),
    ).resolves.toMatchObject({
      status: "accepted",
      determination: {
        experienceVersion: 1,
        locale: "en",
        reference: "CHR · 2026 · A1B2C3",
        issuedAt: "2026-09-02T12:00:00.000Z",
        assessment: {
          assessmentVersion: 1,
          offence: "premature_departure",
          severity: { base: "established", assessed: "material" },
          remedyConstraints: {
            family: "departure_language_protocol",
            binding: "non_binding",
          },
        },
        language: {
          disposition: "upheld_with_circumstances_noted",
          remedy: { title: "Departure language protocol" },
        },
      },
    });
  });

  it("does not issue a determination for malformed or unsupported-locale input", async () => {
    await expect(
      completeFilingReviewWith("ja", completeDraft(), dependencies),
    ).resolves.toMatchObject({ status: "rejected" });
    await expect(
      completeFilingReviewWith(
        "en",
        { ...completeDraft(), impact: "revenge" },
        dependencies,
      ),
    ).resolves.toMatchObject({ status: "rejected" });
  });

  it("issues a complete Digital Conduct determination through deterministic fallback", async () => {
    await expect(
      completeFilingReviewWith("en", completeDigitalDraft(), dependencies),
    ).resolves.toMatchObject({
      status: "accepted",
      determination: {
        reference: "DIG · 2026 · A1B2C3",
        assessment: {
          department: "digital_conduct",
          offence: "fragmented_messages",
          evidence: { messageCount: 8, ideaCount: 2, burstMinutes: 6 },
          remedyConstraints: { family: "message_batching_protocol" },
        },
        language: {
          remedy: { title: "Message batching protocol" },
        },
      },
    });
  });

  it("issues a complete Domestic Affairs determination through deterministic fallback", async () => {
    await expect(
      completeFilingReviewWith("en", completeDomesticDraft(), dependencies),
    ).resolves.toMatchObject({
      status: "accepted",
      determination: {
        reference: "DOM · 2026 · A1B2C3",
        assessment: {
          department: "domestic_affairs",
          offence: "empty_packaging",
          evidence: { emptyPackageCount: 2, recurrencesInThirtyDays: 6 },
          remedyConstraints: { family: "empty_packaging_protocol" },
        },
        language: { remedy: { title: "Empty-packaging protocol" } },
      },
    });
  });

  it("issues a complete Social Planning determination through deterministic fallback", async () => {
    await expect(
      completeFilingReviewWith("en", completeSocialDraft(), dependencies),
    ).resolves.toMatchObject({
      status: "accepted",
      determination: {
        reference: "SOC · 2026 · A1B2C3",
        assessment: {
          department: "social_planning",
          offence: "decision_drift",
          evidence: {
            decisionRoundCount: 5,
            elapsedHours: 72,
            participantCount: 4,
          },
          remedyConstraints: { family: "decision_point_protocol" },
        },
        language: { remedy: { title: "Decision-point protocol" } },
      },
    });
  });

  it("maps an unexpected orchestration failure to a typed terminal outcome", async () => {
    const result = await completeFilingReviewWith("en", completeDraft(), {
      ...dependencies,
      provider: {
        async generate() {
          await Promise.resolve();
          throw new Error("internal provider detail");
        },
      },
    });
    expect(result).toEqual({ status: "failed" });
  });
});

describe("controlled filing completion", () => {
  const idempotencyKey = `fil_${"i".repeat(22)}`;

  it("authorizes every paid attempt and consumes one logical credit", async () => {
    const completion = vi.fn<AccessControlRepository["completeGeneration"]>();
    const reserve = vi.fn<AccessControlRepository["reserveProviderAttempt"]>(
      () => Promise.resolve({ status: "allowed" }),
    );
    const repository = accessRepository({ completion, reserve });
    const provider = vi.fn(() =>
      Promise.resolve({
        status: "success" as const,
        output: CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES[0]?.language,
        model: "test-model",
        requestId: "provider-request",
      }),
    );

    const result = await completeFilingReviewControlledWith(
      "en",
      completeDraft(),
      idempotencyKey,
      controlledDependencies(repository, { generate: provider }),
    );

    expect(result).toMatchObject({
      status: "accepted",
      diagnostics: {
        source: "personalized",
        standardLanguage: {
          remedy: { title: "Departure language protocol" },
        },
      },
    });
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(completion).toHaveBeenCalledWith(
      `gen_${"r".repeat(22)}`,
      "provider",
      "2026-09-02T12:00:00.000Z",
    );
  });

  it("observes a content-free provider outcome without changing the response", async () => {
    const observations: unknown[] = [];
    const repository = accessRepository({});
    const result = await completeFilingReviewControlledWith(
      "en",
      completeDraft(),
      idempotencyKey,
      {
        ...controlledDependencies(repository, {
          generate: () =>
            Promise.resolve({
              status: "success" as const,
              output: CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES[0]?.language,
              model: "test-model",
              requestId: "provider-request",
              usage: { inputTokens: 120, outputTokens: 60 },
            }),
        }),
        monotonicNow: (() => {
          let time = 1_000;
          return () => {
            time += 25;
            return time;
          };
        })(),
        observe: (observation) => observations.push(observation),
      },
    );

    expect(result.status).toBe("accepted");
    expect(observations).toEqual([
      {
        outcome: "accepted_provider",
        accessKind: "evaluation",
        durationMs: 25,
        pathCode: "chronology_premature_departure",
        attempts: 1,
        providerAttempts: 1,
        inputTokens: 120,
        outputTokens: 60,
        model: "test-model",
      },
    ]);
    expect(JSON.stringify(observations)).not.toContain("Marco");
    expect(JSON.stringify(observations)).not.toContain("Shoes");
  });

  it("uses complete fallback without access and never calls the paid provider", async () => {
    const provider = vi.fn();
    const result = await completeFilingReviewControlledWith(
      "en",
      completeDraft(),
      idempotencyKey,
      {
        ...controlledDependencies(null, { generate: provider }),
        sessionCredential: null,
      },
    );
    expect(result).toMatchObject({
      status: "accepted",
      determination: {
        language: { remedy: { title: "Departure language protocol" } },
      },
    });
    expect(result).not.toHaveProperty("diagnostics");
    expect(provider).not.toHaveBeenCalled();
  });

  it("returns localized retry timing without invoking the provider", async () => {
    const provider = vi.fn();
    const repository = accessRepository({
      begin: () =>
        Promise.resolve({ status: "limited", retryAfterSeconds: 37 }),
    });
    await expect(
      completeFilingReviewControlledWith(
        "en",
        completeDraft(),
        idempotencyKey,
        controlledDependencies(repository, { generate: provider }),
      ),
    ).resolves.toEqual({ status: "limited", retryAfterSeconds: 37 });
    expect(provider).not.toHaveBeenCalled();
  });

  it("refunds a reservation when an internal provider boundary throws", async () => {
    const completion = vi.fn<AccessControlRepository["completeGeneration"]>();
    const repository = accessRepository({ completion });
    const result = await completeFilingReviewControlledWith(
      "en",
      completeDraft(),
      idempotencyKey,
      controlledDependencies(repository, {
        async generate() {
          await Promise.resolve();
          throw new Error("private provider failure");
        },
      }),
    );
    expect(result).toEqual({ status: "failed" });
    expect(completion).toHaveBeenCalledWith(
      `gen_${"r".repeat(22)}`,
      "failed",
      "2026-09-02T12:00:00.000Z",
    );
  });

  it("falls back and refunds when the global dispatch guard denies access", async () => {
    const completion = vi.fn<AccessControlRepository["completeGeneration"]>();
    const repository = accessRepository({
      completion,
      reserve: () =>
        Promise.resolve({
          status: "denied",
          reason: "global_budget_exhausted",
        }),
    });
    const provider = vi.fn();
    const result = await completeFilingReviewControlledWith(
      "en",
      completeDraft(),
      idempotencyKey,
      controlledDependencies(repository, { generate: provider }),
    );
    expect(result).toMatchObject({
      status: "accepted",
      diagnostics: { source: "standard" },
    });
    expect(provider).not.toHaveBeenCalled();
    expect(completion).toHaveBeenCalledWith(
      `gen_${"r".repeat(22)}`,
      "fallback",
      "2026-09-02T12:00:00.000Z",
    );
  });
});

function controlledDependencies(
  repository: AccessControlRepository | null,
  provider: Parameters<
    typeof completeFilingReviewControlledWith
  >[3]["provider"],
): Parameters<typeof completeFilingReviewControlledWith>[3] {
  return {
    provider,
    accessRepository: repository,
    sessionCredential: `evs_${"s".repeat(43)}`,
    networkDigest: "n".repeat(64),
    now: () => new Date("2026-09-02T12:00:00.000Z"),
    randomReferencePart: () => "A1B2C3",
    randomAccessBytes: (size) => Buffer.alloc(size, "r"),
  };
}

function accessRepository(overrides: {
  begin?: AccessControlRepository["beginGeneration"];
  reserve?: AccessControlRepository["reserveProviderAttempt"];
  completion?: AccessControlRepository["completeGeneration"];
}): AccessControlRepository {
  return {
    exchangeEvaluationAccess() {
      return Promise.resolve({ status: "invalid" });
    },
    exchangeStandardAccess() {
      return Promise.resolve({ status: "invalid" });
    },
    getStandardAccessStatus() {
      return Promise.resolve({ status: "invalid" });
    },
    issueSuccessorInvitation() {
      return Promise.resolve({ status: "invalid" });
    },
    cancelSuccessorInvitation() {
      return Promise.resolve({ status: "invalid" });
    },
    beginGeneration:
      overrides.begin ??
      (() =>
        Promise.resolve({
          status: "reserved" as const,
          requestId: `gen_${"r".repeat(22)}`,
          reference: "CHR · 2026 · A1B2C3",
          issuedAt: "2026-09-02T12:00:00.000Z",
        })),
    reserveProviderAttempt:
      overrides.reserve ?? (() => Promise.resolve({ status: "allowed" })),
    completeGeneration:
      overrides.completion ??
      (async () => {
        await Promise.resolve();
      }),
  };
}
