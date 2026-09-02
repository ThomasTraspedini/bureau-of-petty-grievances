import type { ProductAnalyticsEvent } from "./product-analytics";

type EventName = ProductAnalyticsEvent["name"];

export interface AnalyticsAnalysisDefinition {
  id: string;
  purpose: string;
  events: readonly EventName[];
  breakdowns: readonly string[];
  interpretation: string;
}

export const ANALYTICS_ANALYSIS_CATALOG = [
  {
    id: "primary_journey_funnel",
    purpose: "Locate loss from first visit through a shareable determination.",
    events: [
      "landing_viewed",
      "filing_started",
      "filing_completion_requested",
      "determination_completed",
      "determination_viewed",
      "public_record_published",
      "share_completed",
    ],
    breakdowns: ["application_version", "entry_surface", "access_kind"],
    interpretation:
      "Compare event conversion and elapsed time by release; accepted provider and fallback outcomes both count as completed determinations.",
  },
  {
    id: "filing_path_and_dropoff",
    purpose:
      "Reveal which filing paths are used and where correction or loss occurs.",
    events: [
      "filing_step_viewed",
      "filing_step_completed",
      "filing_validation_failed",
    ],
    breakdowns: ["step", "path_code", "direction", "reason"],
    interpretation:
      "Path codes describe the rendered product branch only; no answer value or free text is collected.",
  },
  {
    id: "generation_health_and_cost",
    purpose:
      "Balance completion quality, reliability, latency, and provider cost.",
    events: ["determination_completed"],
    breakdowns: [
      "outcome",
      "fallback_reason",
      "access_kind",
      "model",
      "pricing_version",
      "application_version",
    ],
    interpretation:
      "Monitor provider and fallback rates, p50/p95 duration, attempts, tokens, and summed estimated_cost_microusd per accepted determination.",
  },
  {
    id: "shared_record_engagement",
    purpose:
      "Measure whether sharing produces reading and public participation.",
    events: [
      "share_completed",
      "public_record_viewed",
      "consultation_submitted",
      "report_submitted",
    ],
    breakdowns: ["entry_surface", "method", "outcome", "position", "reason"],
    interpretation:
      "Use journey conversion for share-attributed views to consultation, and record_subject only for aggregate record-level engagement.",
  },
  {
    id: "successor_propagation",
    purpose:
      "Measure whether a finite access handoff creates another completed journey.",
    events: [
      "successor_invitation_changed",
      "access_redeemed",
      "filing_started",
      "determination_completed",
    ],
    breakdowns: ["action", "outcome", "kind", "application_version"],
    interpretation:
      "Invitation issue-to-claim conversion uses a purpose-specific invitation pseudonym; later filing behavior remains journey-scoped.",
  },
  {
    id: "operational_reliability",
    purpose:
      "Separate product rejection, limits, provider degradation, and infrastructure failure.",
    events: [
      "access_redeemed",
      "determination_completed",
      "public_record_published",
      "consultation_submitted",
      "report_submitted",
      "owner_record_changed",
      "operational_failure",
    ],
    breakdowns: ["operation", "category", "outcome", "application_version"],
    interpretation:
      "Alerting remains limited to existing cost thresholds; analytics supports diagnosis and release comparison rather than paging.",
  },
] as const satisfies readonly AnalyticsAnalysisDefinition[];
