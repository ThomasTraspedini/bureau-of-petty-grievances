"use client";

import { useEffect, useRef } from "react";

import type {
  AnalyticsEntrySurface,
  AnalyticsFilingStep,
  AnalyticsPathCode,
  AnalyticsSubject,
} from "@/domain/observability/product-analytics";
import type { InterfaceLocale } from "@/i18n/routing";

import {
  analyticsEntrySurface,
  trackBrowserProductEvent,
} from "./browser-product-analytics";

type Surface =
  | { name: "landing" }
  | { name: "filing"; step: AnalyticsFilingStep; pathCode?: AnalyticsPathCode }
  | { name: "determination" }
  | {
      name: "public_record";
      recordSubject: AnalyticsSubject;
      entrySurface: AnalyticsEntrySurface;
    };

export function SurfaceObserver({
  locale,
  surface,
}: {
  locale: InterfaceLocale;
  surface: Surface;
}) {
  const surfaceName = surface.name;
  const step = surface.name === "filing" ? surface.step : undefined;
  const pathCode = surface.name === "filing" ? surface.pathCode : undefined;
  const recordSubject =
    surface.name === "public_record" ? surface.recordSubject : undefined;
  const entrySurface =
    surface.name === "public_record" ? surface.entrySurface : undefined;
  const signature = `${locale}:${surfaceSignature(surface)}`;
  const lastSent = useRef<string | null>(null);
  useEffect(() => {
    if (lastSent.current !== signature) {
      lastSent.current = signature;
      if (surfaceName === "landing") {
        trackBrowserProductEvent({
          locale,
          name: "landing_viewed",
          properties: { entrySurface: analyticsEntrySurface() },
        });
      } else if (surfaceName === "filing" && step) {
        trackBrowserProductEvent({
          locale,
          name: "filing_step_viewed",
          properties: {
            step,
            ...(pathCode ? { pathCode } : {}),
          },
        });
        if (step === "respondent") {
          trackBrowserProductEvent({
            locale,
            name: "filing_started",
            properties: { entrySurface: analyticsEntrySurface() },
          });
        }
      } else if (surfaceName === "determination") {
        trackBrowserProductEvent({
          locale,
          name: "determination_viewed",
          properties: { restored: true },
        });
      } else if (
        surfaceName === "public_record" &&
        recordSubject &&
        entrySurface
      ) {
        trackBrowserProductEvent({
          locale,
          name: "public_record_viewed",
          properties: {
            recordSubject,
            entrySurface,
          },
        });
      }
    }
    if (surfaceName === "landing") {
      const example = document.querySelector<HTMLElement>(
        '[data-analytics-example="true"]',
      );
      const opened = () => {
        trackBrowserProductEvent({
          locale,
          name: "example_opened",
          properties: {},
        });
      };
      example?.addEventListener("click", opened);
      return () => {
        example?.removeEventListener("click", opened);
      };
    }
    return undefined;
  }, [
    entrySurface,
    locale,
    pathCode,
    recordSubject,
    signature,
    step,
    surfaceName,
  ]);
  return null;
}

function surfaceSignature(surface: Surface): string {
  switch (surface.name) {
    case "landing":
    case "determination":
      return surface.name;
    case "filing":
      return `${surface.name}:${surface.step}:${surface.pathCode ?? "none"}`;
    case "public_record":
      return `${surface.name}:${surface.recordSubject}:${surface.entrySurface}`;
  }
}
