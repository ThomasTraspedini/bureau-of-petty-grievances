"use client";

import {
  PRODUCT_ANALYTICS_SCHEMA_VERSION,
  type AnalyticsJourneyId,
  type AnalyticsDepartmentCode,
  type BrowserProductAnalyticsEvent,
} from "@/domain/observability/product-analytics";

const JOURNEY_STORAGE_KEY = "bpg:analytics-journey:v1";
const COLLECTOR_PATH = "/api/observability";

type BrowserEventInput = BrowserProductAnalyticsEvent extends infer Event
  ? Event extends BrowserProductAnalyticsEvent
    ? Omit<
        Event,
        "schemaVersion" | "eventId" | "journeyId" | "occurredAt" | "department"
      >
    : never
  : never;

export function trackBrowserProductEvent(
  input: BrowserEventInput,
  department: AnalyticsDepartmentCode = "chronology",
): void {
  if (!browserAnalyticsEnabled()) return;
  try {
    const journeyId = getOrCreateAnalyticsJourneyId(window.sessionStorage);
    const event = {
      ...input,
      schemaVersion: PRODUCT_ANALYTICS_SCHEMA_VERSION,
      eventId: randomIdentifier("evt"),
      journeyId,
      occurredAt: new Date().toISOString(),
      department,
    } as BrowserProductAnalyticsEvent;
    void fetch(COLLECTOR_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Instrumentation cannot change or interrupt the product journey.
  }
}

export function currentAnalyticsJourneyId(): AnalyticsJourneyId | null {
  if (!browserAnalyticsEnabled()) return null;
  try {
    return getOrCreateAnalyticsJourneyId(window.sessionStorage);
  } catch {
    return null;
  }
}

export function getOrCreateAnalyticsJourneyId(
  storage: Pick<Storage, "getItem" | "setItem">,
): AnalyticsJourneyId {
  const existing = storage.getItem(JOURNEY_STORAGE_KEY);
  if (existing && /^jrn_[A-Za-z0-9_-]{22}$/u.test(existing)) {
    return existing as AnalyticsJourneyId;
  }
  const created = randomIdentifier("jrn") as AnalyticsJourneyId;
  storage.setItem(JOURNEY_STORAGE_KEY, created);
  return created;
}

export function analyticsEntrySurface(): "direct" | "internal" | "external" {
  if (!document.referrer) return "direct";
  try {
    return new URL(document.referrer).origin === window.location.origin
      ? "internal"
      : "external";
  } catch {
    return "direct";
  }
}

function browserAnalyticsEnabled(): boolean {
  return document.documentElement.dataset.analytics === "enabled";
}

function randomIdentifier(prefix: "evt" | "jrn"): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${prefix}_${window
    .btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "")}`;
}
