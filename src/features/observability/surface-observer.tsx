"use client";

import { useEffect, useRef } from "react";

import type {
  AnalyticsEntrySurface,
  AnalyticsDepartmentCode,
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
  | {
      name: "filing";
      department?: AnalyticsDepartmentCode;
      step: AnalyticsFilingStep;
      pathCode?: AnalyticsPathCode;
    }
  | { name: "determination"; department?: AnalyticsDepartmentCode }
  | {
      name: "public_record";
      department?: AnalyticsDepartmentCode;
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
  const department =
    surface.name === "landing"
      ? "chronology"
      : (surface.department ?? "chronology");
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
        trackBrowserProductEvent(
          {
            locale,
            name: "landing_viewed",
            properties: { entrySurface: analyticsEntrySurface() },
          },
          department,
        );
      } else if (surfaceName === "filing" && step) {
        trackBrowserProductEvent(
          {
            locale,
            name: "filing_step_viewed",
            properties: {
              step,
              ...(pathCode ? { pathCode } : {}),
            },
          },
          department,
        );
        if (step === "respondent") {
          trackBrowserProductEvent(
            {
              locale,
              name: "filing_started",
              properties: { entrySurface: analyticsEntrySurface() },
            },
            department,
          );
        }
      } else if (surfaceName === "determination") {
        trackBrowserProductEvent(
          {
            locale,
            name: "determination_viewed",
            properties: { restored: true },
          },
          department,
        );
      } else if (
        surfaceName === "public_record" &&
        recordSubject &&
        entrySurface
      ) {
        trackBrowserProductEvent(
          {
            locale,
            name: "public_record_viewed",
            properties: {
              recordSubject,
              entrySurface,
            },
          },
          department,
        );
      }
    }
    if (surfaceName === "landing") {
      const example = document.querySelector<HTMLElement>(
        '[data-analytics-example="true"]',
      );
      const opened = () => {
        trackBrowserProductEvent(
          {
            locale,
            name: "example_opened",
            properties: {},
          },
          department,
        );
      };
      example?.addEventListener("click", opened);
      return () => {
        example?.removeEventListener("click", opened);
      };
    }
    return undefined;
  }, [
    entrySurface,
    department,
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
      return `${surface.name}:${surface.department ?? "chronology"}:${surface.step}:${surface.pathCode ?? "none"}`;
    case "public_record":
      return `${surface.name}:${surface.department ?? "chronology"}:${surface.recordSubject}:${surface.entrySurface}`;
  }
}
