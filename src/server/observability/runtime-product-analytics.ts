import { createHmac, randomBytes } from "node:crypto";

import {
  ANALYTICS_RETENTION_DAYS,
  isAnalyticsJourneyId,
  isProductAnalyticsEvent,
  PRODUCT_ANALYTICS_SCHEMA_VERSION,
  type AnalyticsJourneyId,
  type AnalyticsSubject,
  type ProductAnalyticsEvent,
} from "@/domain/observability/product-analytics";
import { MixpanelProductAnalyticsProvider } from "@/providers/mixpanel-product-analytics";
import { type ProductAnalyticsProvider } from "@/providers/product-analytics-provider";

export interface ProductAnalyticsConfiguration {
  enabled: true;
  applicationVersion: string;
  environment: "development" | "test" | "production";
  projectToken: string;
  region: "eu" | "us";
  hmacSecret: string;
  retentionDays: typeof ANALYTICS_RETENTION_DAYS;
  pricingVersion: string;
  inputMicrousdPerMillionTokens: number;
  outputMicrousdPerMillionTokens: number;
}

export type ProductAnalyticsConfigurationResult =
  | { status: "disabled" }
  | { status: "invalid"; reason: AnalyticsConfigurationIssue }
  | { status: "enabled"; configuration: ProductAnalyticsConfiguration };

export type AnalyticsConfigurationIssue =
  | "project_token"
  | "region"
  | "hmac_secret"
  | "retention"
  | "application_version"
  | "pricing_version"
  | "input_price"
  | "output_price";

type ServerEventInput = ProductAnalyticsEvent extends infer Event
  ? Event extends ProductAnalyticsEvent
    ? Omit<Event, "schemaVersion" | "eventId" | "occurredAt" | "journeyId"> & {
        journeyId?: unknown;
      }
    : never
  : never;

interface RuntimeAnalytics {
  configuration: ProductAnalyticsConfiguration;
  provider: ProductAnalyticsProvider;
}

let runtime: RuntimeAnalytics | null | undefined;

export function resolveProductAnalyticsConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ProductAnalyticsConfigurationResult {
  if (environment.BUREAU_ANALYTICS_ENABLED !== "true") {
    return { status: "disabled" };
  }
  const projectToken = environment.BUREAU_MIXPANEL_PROJECT_TOKEN?.trim();
  if (!projectToken || !/^[A-Za-z0-9]{16,64}$/u.test(projectToken)) {
    return { status: "invalid", reason: "project_token" };
  }
  const region = environment.BUREAU_MIXPANEL_REGION?.trim();
  if (region !== "eu" && region !== "us") {
    return { status: "invalid", reason: "region" };
  }
  const hmacSecret = environment.BUREAU_ANALYTICS_HMAC_SECRET?.trim();
  if (!hmacSecret || hmacSecret.length < 32) {
    return { status: "invalid", reason: "hmac_secret" };
  }
  if (
    environment.BUREAU_ANALYTICS_RETENTION_DAYS !==
    String(ANALYTICS_RETENTION_DAYS)
  ) {
    return { status: "invalid", reason: "retention" };
  }
  const applicationVersion = environment.BUREAU_APPLICATION_VERSION?.trim();
  if (
    !applicationVersion ||
    !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u.test(applicationVersion)
  ) {
    return { status: "invalid", reason: "application_version" };
  }
  const pricingVersion = environment.BUREAU_ANALYTICS_PRICING_VERSION?.trim();
  if (!pricingVersion || !/^[A-Za-z0-9._:-]{1,64}$/u.test(pricingVersion)) {
    return { status: "invalid", reason: "pricing_version" };
  }
  const inputPrice = parsePrice(
    environment.BUREAU_ANALYTICS_INPUT_MICROUSD_PER_MILLION_TOKENS,
  );
  if (inputPrice === null) return { status: "invalid", reason: "input_price" };
  const outputPrice = parsePrice(
    environment.BUREAU_ANALYTICS_OUTPUT_MICROUSD_PER_MILLION_TOKENS,
  );
  if (outputPrice === null)
    return { status: "invalid", reason: "output_price" };

  return {
    status: "enabled",
    configuration: {
      enabled: true,
      applicationVersion,
      environment: normalizeEnvironment(environment.NODE_ENV),
      projectToken,
      region,
      hmacSecret,
      retentionDays: ANALYTICS_RETENTION_DAYS,
      pricingVersion,
      inputMicrousdPerMillionTokens: inputPrice,
      outputMicrousdPerMillionTokens: outputPrice,
    },
  };
}

export function isRuntimeProductAnalyticsEnabled(): boolean {
  return getRuntimeProductAnalytics() !== null;
}

export function analyticsSubject(
  kind: "public_record" | "successor_invitation",
  value: string,
): AnalyticsSubject | null {
  const active = getRuntimeProductAnalytics();
  if (active === null) return null;
  const digest = createHmac("sha256", active.configuration.hmacSecret)
    .update(`${kind}\u0000${value}`)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
  return `sub_${digest}`;
}

export async function recordServerProductEvent(
  input: ServerEventInput,
): Promise<void> {
  const active = getRuntimeProductAnalytics();
  if (active === null) return;
  const event = enrichEvent(input, active.configuration);
  if (!isProductAnalyticsEvent(event)) return;
  try {
    await active.provider.track({
      event,
      applicationVersion: active.configuration.applicationVersion,
      environment: active.configuration.environment,
    });
  } catch {
    // Analytics never participates in the success condition of product work.
  }
}

export async function deliverBrowserProductEvent(
  event: ProductAnalyticsEvent,
): Promise<void> {
  const active = getRuntimeProductAnalytics();
  if (active === null || !isProductAnalyticsEvent(event)) return;
  try {
    await active.provider.track({
      event,
      applicationVersion: active.configuration.applicationVersion,
      environment: active.configuration.environment,
    });
  } catch {
    // Browser collection is deliberately best-effort and failure-isolated.
  }
}

export function resetRuntimeProductAnalyticsForTests(): void {
  runtime = undefined;
}

function getRuntimeProductAnalytics(): RuntimeAnalytics | null {
  if (runtime !== undefined) return runtime;
  const result = resolveProductAnalyticsConfiguration();
  if (result.status !== "enabled") {
    runtime = null;
    return runtime;
  }
  runtime = {
    configuration: result.configuration,
    provider: new MixpanelProductAnalyticsProvider({
      projectToken: result.configuration.projectToken,
      region: result.configuration.region,
    }),
  };
  return runtime;
}

function enrichEvent(
  input: ServerEventInput,
  configuration: ProductAnalyticsConfiguration,
): ProductAnalyticsEvent {
  const journeyId: AnalyticsJourneyId | null = isAnalyticsJourneyId(
    input.journeyId,
  )
    ? input.journeyId
    : null;
  const event = {
    schemaVersion: PRODUCT_ANALYTICS_SCHEMA_VERSION,
    eventId: `evt_${randomBytes(16).toString("base64url")}`,
    journeyId,
    occurredAt: new Date().toISOString(),
    locale: input.locale,
    department: input.department,
    name: input.name,
    properties: input.properties,
  } as ProductAnalyticsEvent;
  if (event.name !== "determination_completed") return event;
  const inputTokens = event.properties.inputTokens ?? 0;
  const outputTokens = event.properties.outputTokens ?? 0;
  const estimatedCostMicrousd = Math.ceil(
    (inputTokens * configuration.inputMicrousdPerMillionTokens +
      outputTokens * configuration.outputMicrousdPerMillionTokens) /
      1_000_000,
  );
  return {
    ...event,
    properties: {
      ...event.properties,
      estimatedCostMicrousd,
      pricingVersion: configuration.pricingVersion,
    },
  };
}

function parsePrice(value: string | undefined): number | null {
  const normalized = value?.trim();
  if (!normalized || !/^\d+$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 100_000_000
    ? parsed
    : null;
}

function normalizeEnvironment(
  value: string | undefined,
): "development" | "test" | "production" {
  if (value === "production" || value === "test") return value;
  return "development";
}
