import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/observability/route";
import { ANALYTICS_ANALYSIS_CATALOG } from "@/domain/observability/analysis-catalog";
import {
  isBrowserProductAnalyticsEvent,
  isProductAnalyticsEvent,
  type BrowserProductAnalyticsEvent,
} from "@/domain/observability/product-analytics";
import {
  analyticsEntrySurface,
  getOrCreateAnalyticsJourneyId,
  trackBrowserProductEvent,
} from "@/features/observability/browser-product-analytics";
import {
  analyticsSubject,
  recordServerProductEvent,
  resetRuntimeProductAnalyticsForTests,
  resolveProductAnalyticsConfiguration,
} from "@/server/observability/runtime-product-analytics";

const now = new Date("2026-09-03T12:00:00.000Z");

function browserEvent(): BrowserProductAnalyticsEvent {
  return {
    schemaVersion: 1,
    eventId: `evt_${"e".repeat(22)}`,
    journeyId: `jrn_${"j".repeat(22)}`,
    occurredAt: now.toISOString(),
    locale: "en",
    department: "chronology",
    name: "filing_step_completed",
    properties: {
      step: "chronology",
      direction: "forward",
      durationMs: 2_400,
      pathCode: "chronology_chronic_lateness",
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetRuntimeProductAnalyticsForTests();
  window.sessionStorage.clear();
  document.documentElement.dataset.analytics = "disabled";
});

describe("product analytics contract", () => {
  it("accepts an exact language-neutral browser event", () => {
    expect(isBrowserProductAnalyticsEvent(browserEvent(), now)).toBe(true);
    expect(isProductAnalyticsEvent(browserEvent(), now)).toBe(true);
  });

  it("rejects arbitrary metadata, raw case content, and stale event time", () => {
    expect(
      isBrowserProductAnalyticsEvent(
        {
          ...browserEvent(),
          properties: {
            ...browserEvent().properties,
            respondent: "Marco",
          },
        },
        now,
      ),
    ).toBe(false);
    expect(
      isBrowserProductAnalyticsEvent(
        { ...browserEvent(), occurredAt: "2026-09-01T12:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isBrowserProductAnalyticsEvent(
        {
          ...browserEvent(),
          name: "provider_prompt_captured",
          properties: { prompt: "private filing" },
        },
        now,
      ),
    ).toBe(false);
  });

  it("keeps every analysis tied to declared event names", () => {
    const analyses = ANALYTICS_ANALYSIS_CATALOG.map((item) => item.id);
    expect(analyses).toEqual([
      "primary_journey_funnel",
      "filing_path_and_dropoff",
      "generation_health_and_cost",
      "shared_record_engagement",
      "successor_propagation",
      "operational_reliability",
    ]);
    expect(ANALYTICS_ANALYSIS_CATALOG.flatMap((item) => item.events)).toContain(
      "determination_completed",
    );
  });
});

describe("analytics runtime configuration and privacy", () => {
  it("stays disabled by default and rejects incomplete enabled settings", () => {
    expect(resolveProductAnalyticsConfiguration({})).toEqual({
      status: "disabled",
    });
    expect(
      resolveProductAnalyticsConfiguration({
        BUREAU_ANALYTICS_ENABLED: "true",
      }),
    ).toEqual({ status: "invalid", reason: "project_token" });
  });

  it("requires an explicit release, price snapshot, region, and retention", () => {
    const result = resolveProductAnalyticsConfiguration(configuration());
    expect(result).toMatchObject({
      status: "enabled",
      configuration: {
        applicationVersion: "0.13.0",
        region: "eu",
        retentionDays: 180,
        pricingVersion: "prices-2026-09-03",
      },
    });
    expect(
      resolveProductAnalyticsConfiguration({
        ...configuration(),
        BUREAU_ANALYTICS_RETENTION_DAYS: "365",
      }),
    ).toEqual({ status: "invalid", reason: "retention" });
  });

  it("creates stable purpose-separated subjects without exposing source identifiers", () => {
    stubConfiguration();
    const record = analyticsSubject("public_record", "rec_private-address");
    const repeated = analyticsSubject("public_record", "rec_private-address");
    const invitation = analyticsSubject(
      "successor_invitation",
      "rec_private-address",
    );
    expect(record).toMatch(/^sub_[A-Za-z0-9_-]{22}$/u);
    expect(record).toBe(repeated);
    expect(record).not.toBe(invitation);
    expect(record).not.toContain("private-address");
  });

  it("adds release and versioned cost without sending raw product content", async () => {
    stubConfiguration();
    const fetchMock = vi.fn<
      (
        input: string,
        init: RequestInit,
      ) => Promise<Pick<Response, "ok" | "json">>
    >(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 1 }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await recordServerProductEvent({
      journeyId: `jrn_${"j".repeat(22)}`,
      locale: "en",
      department: "chronology",
      name: "determination_completed",
      properties: {
        outcome: "accepted_provider",
        accessKind: "evaluation",
        durationMs: 1_250,
        pathCode: "chronology_premature_departure",
        attempts: 1,
        providerAttempts: 1,
        inputTokens: 400,
        outputTokens: 200,
        model: "gpt-5.6-luna",
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [endpoint, init] = fetchMock.mock.calls[0] ?? [];
    expect(endpoint).toBe("https://api-eu.mixpanel.com/track?ip=0&verbose=1");
    if (typeof init?.body !== "string") throw new Error("Missing JSON body");
    const payload = JSON.parse(init.body) as unknown;
    expect(payload).toMatchObject([
      {
        event: "determination_completed",
        properties: {
          application_version: "0.13.0",
          environment: "production",
          pricing_version: "prices-2026-09-03",
          estimated_cost_microusd: 200,
          input_tokens: 400,
          output_tokens: 200,
        },
      },
    ]);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("respondent");
    expect(serialized).not.toContain("witness");
    expect(serialized).not.toContain("prompt");
    expect(serialized).not.toContain("generated prose");
  });
});

describe("browser analytics boundary", () => {
  it("uses one tab-scoped journey identifier and sends only to the same-origin collector", async () => {
    document.documentElement.dataset.analytics = "enabled";
    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(() => Promise.resolve(new Response(null)));
    vi.stubGlobal("fetch", fetchMock);

    const first = getOrCreateAnalyticsJourneyId(window.sessionStorage);
    const second = getOrCreateAnalyticsJourneyId(window.sessionStorage);
    expect(first).toBe(second);

    trackBrowserProductEvent({
      locale: "en",
      name: "landing_viewed",
      properties: { entrySurface: "direct" },
    });
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/observability",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
      }),
    );
    const [, init] = fetchMock.mock.calls[0] ?? [];
    if (typeof init?.body !== "string") throw new Error("Missing JSON body");
    const serialized = init.body;
    expect(serialized).not.toContain("location");
    expect(serialized).not.toContain("referrer");
  });

  it("does nothing when disabled and categorizes referrers without sending them", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    trackBrowserProductEvent({
      locale: "en",
      name: "landing_viewed",
      properties: { entrySurface: "direct" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(analyticsEntrySurface()).toBe("direct");
  });

  it("rejects cross-origin, oversized, and unknown collector payloads", async () => {
    const crossOrigin = await POST(
      new Request("https://bureau.example/api/observability", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        body: JSON.stringify(browserEvent()),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const unknown = await POST(
      new Request("https://bureau.example/api/observability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...browserEvent(), properties: { raw: "x" } }),
      }),
    );
    expect(unknown.status).toBe(400);

    const oversized = await POST(
      new Request("https://bureau.example/api/observability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(5_000) }),
      }),
    );
    expect(oversized.status).toBe(413);
  });
});

function configuration(): Record<string, string> {
  return {
    BUREAU_ANALYTICS_ENABLED: "true",
    BUREAU_MIXPANEL_PROJECT_TOKEN: "a".repeat(32),
    BUREAU_MIXPANEL_REGION: "eu",
    BUREAU_ANALYTICS_HMAC_SECRET: "h".repeat(32),
    BUREAU_ANALYTICS_RETENTION_DAYS: "180",
    BUREAU_APPLICATION_VERSION: "0.13.0",
    BUREAU_ANALYTICS_PRICING_VERSION: "prices-2026-09-03",
    BUREAU_ANALYTICS_INPUT_MICROUSD_PER_MILLION_TOKENS: "250000",
    BUREAU_ANALYTICS_OUTPUT_MICROUSD_PER_MILLION_TOKENS: "500000",
    NODE_ENV: "production",
  };
}

function stubConfiguration(): void {
  for (const [key, value] of Object.entries(configuration())) {
    vi.stubEnv(key, value);
  }
  resetRuntimeProductAnalyticsForTests();
}
