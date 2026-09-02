import type { ProductAnalyticsEvent } from "@/domain/observability/product-analytics";
import type {
  ProductAnalyticsDelivery,
  ProductAnalyticsProvider,
} from "@/providers/product-analytics-provider";

const DELIVERY_TIMEOUT_MS = 750;

type FetchResponse = Pick<Response, "ok" | "json">;
type FetchImplementation = (
  input: string,
  init: RequestInit,
) => Promise<FetchResponse>;

export interface MixpanelProductAnalyticsOptions {
  projectToken: string;
  region: "eu" | "us";
  fetch?: FetchImplementation;
}

export class MixpanelProductAnalyticsProvider implements ProductAnalyticsProvider {
  private readonly fetchImplementation: FetchImplementation;

  constructor(private readonly options: MixpanelProductAnalyticsOptions) {
    this.fetchImplementation =
      options.fetch ?? ((input, init) => fetch(input, init));
  }

  async track(delivery: ProductAnalyticsDelivery): Promise<void> {
    const endpoint =
      this.options.region === "eu"
        ? "https://api-eu.mixpanel.com/track?ip=0&verbose=1"
        : "https://api.mixpanel.com/track?ip=0&verbose=1";
    const event = delivery.event;
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        {
          event: event.name,
          properties: {
            token: this.options.projectToken,
            time: Math.floor(Date.parse(event.occurredAt) / 1000),
            distinct_id: distinctId(event),
            $insert_id: event.eventId,
            schema_version: event.schemaVersion,
            application_version: delivery.applicationVersion,
            environment: delivery.environment,
            locale: event.locale,
            department: event.department,
            ...(event.journeyId === null
              ? {}
              : { journey_id: event.journeyId }),
            ...snakeCaseProperties(event.properties),
          },
        },
      ]),
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("analytics_delivery_failed");
    const body: unknown = await response.json();
    if (!isAcceptedResponse(body)) {
      throw new Error("analytics_delivery_rejected");
    }
  }
}

function distinctId(event: ProductAnalyticsEvent): string {
  if (
    event.name === "successor_invitation_changed" &&
    event.properties.invitationSubject
  ) {
    return event.properties.invitationSubject;
  }
  return event.journeyId ?? "bureau_system";
}

function snakeCaseProperties(
  properties: ProductAnalyticsEvent["properties"],
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`)] =
        value;
    }
  }
  return result;
}

function isAcceptedResponse(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "status") === 1
  );
}
