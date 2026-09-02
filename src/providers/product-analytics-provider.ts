import type { ProductAnalyticsEvent } from "@/domain/observability/product-analytics";

export interface ProductAnalyticsDelivery {
  event: ProductAnalyticsEvent;
  applicationVersion: string;
  environment: "development" | "test" | "production";
}

export interface ProductAnalyticsProvider {
  track(delivery: ProductAnalyticsDelivery): Promise<void>;
}

export function createUnavailableProductAnalyticsProvider(): ProductAnalyticsProvider {
  return {
    async track() {
      await Promise.resolve();
    },
  };
}
