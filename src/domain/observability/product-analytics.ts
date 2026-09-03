export const PRODUCT_ANALYTICS_SCHEMA_VERSION = 4 as const;

export const ANALYTICS_RETENTION_DAYS = 180 as const;
export const ANALYTICS_EVENT_ID_PATTERN = /^evt_[A-Za-z0-9_-]{22}$/u;
export const ANALYTICS_JOURNEY_ID_PATTERN = /^jrn_[A-Za-z0-9_-]{22}$/u;
export const ANALYTICS_SUBJECT_PATTERN = /^sub_[A-Za-z0-9_-]{22}$/u;

export const ANALYTICS_FILING_STEPS = [
  "respondent",
  "relationship",
  "department",
  "classification",
  "chronology",
  "communications",
  "domestic_evidence",
  "social_evidence",
  "impact",
  "mitigation",
  "statement",
  "review",
] as const;

export type AnalyticsFilingStep = (typeof ANALYTICS_FILING_STEPS)[number];
export type AnalyticsJourneyId = `jrn_${string}`;
export type AnalyticsSubject = `sub_${string}`;
export type AnalyticsEntrySurface =
  | "direct"
  | "internal"
  | "share"
  | "evaluation"
  | "standard"
  | "successor"
  | "external";
export type AnalyticsPathCode =
  | "chronology_premature_departure"
  | "chronology_chronic_lateness"
  | "chronology_optimistic_estimate"
  | "digital_conduct_fragmented_messages"
  | "digital_conduct_excessive_voice_note"
  | "digital_conduct_unacknowledged_coordination"
  | "domestic_affairs_token_remainder"
  | "domestic_affairs_misplaced_object"
  | "domestic_affairs_empty_packaging"
  | "social_planning_option_veto_cycle"
  | "social_planning_decision_drift"
  | "social_planning_confirmed_plan_revision";
export type AnalyticsDepartmentCode =
  "chronology" | "digital_conduct" | "domestic_affairs" | "social_planning";
export type AnalyticsAccessKind = "anonymous" | "evaluation" | "standard";

interface EventEnvelope<Name extends string, Properties> {
  schemaVersion: typeof PRODUCT_ANALYTICS_SCHEMA_VERSION;
  eventId: string;
  journeyId: AnalyticsJourneyId | null;
  occurredAt: string;
  locale: ProductLocale;
  department: AnalyticsDepartmentCode;
  name: Name;
  properties: Properties;
}

export type BrowserProductAnalyticsEvent =
  | EventEnvelope<"landing_viewed", { entrySurface: AnalyticsEntrySurface }>
  | EventEnvelope<"example_opened", Record<string, never>>
  | EventEnvelope<"filing_started", { entrySurface: AnalyticsEntrySurface }>
  | EventEnvelope<
      "filing_step_viewed",
      { step: AnalyticsFilingStep; pathCode?: AnalyticsPathCode }
    >
  | EventEnvelope<
      "filing_step_completed",
      {
        step: AnalyticsFilingStep;
        direction: "forward" | "review_correction";
        durationMs: number;
        pathCode?: AnalyticsPathCode;
      }
    >
  | EventEnvelope<
      "filing_validation_failed",
      {
        step: AnalyticsFilingStep;
        reason: "required" | "invalid" | "restricted_content";
      }
    >
  | EventEnvelope<
      "filing_completion_requested",
      { pathCode: AnalyticsPathCode }
    >
  | EventEnvelope<"determination_viewed", { restored: true }>
  | EventEnvelope<
      "public_record_viewed",
      { recordSubject: AnalyticsSubject; entrySurface: AnalyticsEntrySurface }
    >
  | EventEnvelope<
      "share_completed",
      {
        recordSubject: AnalyticsSubject;
        method: "native" | "clipboard" | "manual";
        outcome: "completed" | "cancelled" | "failed";
      }
    >;

export type ServerProductAnalyticsEvent =
  | EventEnvelope<
      "determination_completed",
      {
        outcome:
          | "accepted_provider"
          | "accepted_fallback"
          | "rejected"
          | "limited"
          | "failed";
        accessKind: AnalyticsAccessKind;
        durationMs: number;
        pathCode?: AnalyticsPathCode;
        attempts?: 1 | 2;
        providerAttempts?: 0 | 1 | 2;
        fallbackReason?: AnalyticsFallbackReason;
        inputTokens?: number;
        outputTokens?: number;
        estimatedCostMicrousd?: number;
        pricingVersion?: string;
        model?: string;
      }
    >
  | EventEnvelope<
      "public_record_published",
      {
        outcome: "published" | "invalid" | "failed";
        created?: boolean;
        recordSubject?: AnalyticsSubject;
      }
    >
  | EventEnvelope<
      "consultation_submitted",
      {
        recordSubject: AnalyticsSubject;
        outcome: "accepted" | "invalid" | "unavailable" | "failed";
        position?:
          | "grievance_upheld"
          | "grievance_dismissed"
          | "upheld_with_circumstances_noted";
      }
    >
  | EventEnvelope<
      "report_submitted",
      {
        recordSubject: AnalyticsSubject;
        outcome: "reported" | "invalid" | "unavailable" | "failed";
        reason?:
          | "privacy_concern"
          | "harmful_content"
          | "wrong_person"
          | "other_safety_concern";
      }
    >
  | EventEnvelope<
      "access_redeemed",
      {
        kind: "evaluation" | "standard" | "successor";
        outcome:
          | "accepted"
          | "invalid"
          | "expired"
          | "claimed"
          | "revoked"
          | "limited"
          | "unavailable";
        invitationSubject?: AnalyticsSubject;
      }
    >
  | EventEnvelope<
      "successor_invitation_changed",
      {
        action: "issue" | "replace" | "cancel" | "claim";
        outcome:
          | "accepted"
          | "issued"
          | "cancelled"
          | "invalid"
          | "expired"
          | "claimed"
          | "revoked"
          | "limited"
          | "transferred"
          | "not_eligible"
          | "exhausted"
          | "pending"
          | "not_pending"
          | "disabled"
          | "unavailable";
        invitationSubject?: AnalyticsSubject;
      }
    >
  | EventEnvelope<
      "owner_record_changed",
      {
        action: "unpublish" | "restore" | "delete";
        outcome:
          | "updated"
          | "deleted"
          | "invalid"
          | "unauthorized"
          | "unavailable"
          | "failed";
        recordSubject: AnalyticsSubject;
      }
    >
  | EventEnvelope<
      "operational_failure",
      {
        operation:
          | "analytics_delivery"
          | "filing_completion"
          | "record_persistence"
          | "consultation_persistence"
          | "report_persistence"
          | "access_control";
        category:
          | "configuration"
          | "validation"
          | "provider"
          | "persistence"
          | "rate_limit"
          | "budget"
          | "unexpected";
      }
    >;

export type ProductAnalyticsEvent =
  BrowserProductAnalyticsEvent | ServerProductAnalyticsEvent;

export type AnalyticsFallbackReason =
  | "anonymous"
  | "invalid_session"
  | "expired_session"
  | "revoked_grant"
  | "expired_grant"
  | "exhausted_grant"
  | "generation_disabled"
  | "global_budget_exhausted"
  | "control_unavailable"
  | "recovered_request"
  | "completed_request"
  | "expired_entitlement"
  | "revoked_entitlement"
  | "transfer_pending"
  | "transferred_access"
  | "refusal"
  | "invalid_output"
  | "timeout"
  | "rate_limited"
  | "transport"
  | "provider_unavailable"
  | "configuration"
  | "request_rejected";

const BROWSER_EVENT_NAMES = new Set<BrowserProductAnalyticsEvent["name"]>([
  "landing_viewed",
  "example_opened",
  "filing_started",
  "filing_step_viewed",
  "filing_step_completed",
  "filing_validation_failed",
  "filing_completion_requested",
  "determination_viewed",
  "public_record_viewed",
  "share_completed",
]);

const ENTRY_SURFACES = new Set<AnalyticsEntrySurface>([
  "direct",
  "internal",
  "share",
  "evaluation",
  "standard",
  "successor",
  "external",
]);
const PATH_CODES = new Set<AnalyticsPathCode>([
  "chronology_premature_departure",
  "chronology_chronic_lateness",
  "chronology_optimistic_estimate",
  "digital_conduct_fragmented_messages",
  "digital_conduct_excessive_voice_note",
  "digital_conduct_unacknowledged_coordination",
  "domestic_affairs_token_remainder",
  "domestic_affairs_misplaced_object",
  "domestic_affairs_empty_packaging",
  "social_planning_option_veto_cycle",
  "social_planning_decision_drift",
  "social_planning_confirmed_plan_revision",
]);
const FILING_STEPS = new Set<string>(ANALYTICS_FILING_STEPS);
const FALLBACK_REASONS = new Set<AnalyticsFallbackReason>([
  "anonymous",
  "invalid_session",
  "expired_session",
  "revoked_grant",
  "expired_grant",
  "exhausted_grant",
  "generation_disabled",
  "global_budget_exhausted",
  "control_unavailable",
  "recovered_request",
  "completed_request",
  "expired_entitlement",
  "revoked_entitlement",
  "transfer_pending",
  "transferred_access",
  "refusal",
  "invalid_output",
  "timeout",
  "rate_limited",
  "transport",
  "provider_unavailable",
  "configuration",
  "request_rejected",
]);

export function isAnalyticsJourneyId(
  value: unknown,
): value is AnalyticsJourneyId {
  return typeof value === "string" && ANALYTICS_JOURNEY_ID_PATTERN.test(value);
}

export function isAnalyticsSubject(value: unknown): value is AnalyticsSubject {
  return typeof value === "string" && ANALYTICS_SUBJECT_PATTERN.test(value);
}

export function isBrowserProductAnalyticsEvent(
  value: unknown,
  receivedAt = new Date(),
): value is BrowserProductAnalyticsEvent {
  if (
    !isEnvelope(value, receivedAt) ||
    !BROWSER_EVENT_NAMES.has(value.name as BrowserProductAnalyticsEvent["name"])
  ) {
    return false;
  }
  return propertiesAreValid(value.name, value.properties, true);
}

export function isProductAnalyticsEvent(
  value: unknown,
  receivedAt = new Date(),
): value is ProductAnalyticsEvent {
  if (!isEnvelope(value, receivedAt)) return false;
  return propertiesAreValid(value.name, value.properties, false);
}

function isEnvelope(
  value: unknown,
  receivedAt: Date,
): value is Record<string, unknown> & {
  name: string;
  properties: Record<string, unknown>;
} {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "schemaVersion",
      "eventId",
      "journeyId",
      "occurredAt",
      "locale",
      "department",
      "name",
      "properties",
    ])
  )
    return false;
  if (
    value.schemaVersion !== PRODUCT_ANALYTICS_SCHEMA_VERSION ||
    typeof value.eventId !== "string" ||
    !ANALYTICS_EVENT_ID_PATTERN.test(value.eventId) ||
    (value.journeyId !== null && !isAnalyticsJourneyId(value.journeyId)) ||
    !isProductLocale(value.locale) ||
    (value.department !== "chronology" &&
      value.department !== "digital_conduct" &&
      value.department !== "domestic_affairs" &&
      value.department !== "social_planning") ||
    typeof value.name !== "string" ||
    !isRecord(value.properties)
  )
    return false;
  const occurredAt = Date.parse(String(value.occurredAt));
  return (
    Number.isFinite(occurredAt) &&
    Math.abs(receivedAt.getTime() - occurredAt) <= 24 * 60 * 60 * 1000
  );
}

function propertiesAreValid(
  name: string,
  properties: Record<string, unknown>,
  browserOnly: boolean,
): boolean {
  switch (name) {
    case "landing_viewed":
    case "filing_started":
      return exactEnum(properties, "entrySurface", ENTRY_SURFACES);
    case "example_opened":
      return hasOnlyKeys(properties, []);
    case "filing_step_viewed":
      return filingStepProperties(properties, false);
    case "filing_step_completed":
      return (
        filingStepProperties(properties, true) &&
        (properties.direction === "forward" ||
          properties.direction === "review_correction") &&
        isDuration(properties.durationMs)
      );
    case "filing_validation_failed":
      return (
        hasOnlyKeys(properties, ["step", "reason"]) &&
        FILING_STEPS.has(String(properties.step)) &&
        ["required", "invalid", "restricted_content"].includes(
          String(properties.reason),
        )
      );
    case "filing_completion_requested":
      return exactEnum(properties, "pathCode", PATH_CODES);
    case "determination_viewed":
      return (
        hasOnlyKeys(properties, ["restored"]) && properties.restored === true
      );
    case "public_record_viewed":
      return (
        hasOnlyKeys(properties, ["recordSubject", "entrySurface"]) &&
        isAnalyticsSubject(properties.recordSubject) &&
        ENTRY_SURFACES.has(properties.entrySurface as AnalyticsEntrySurface)
      );
    case "share_completed":
      return (
        hasOnlyKeys(properties, ["recordSubject", "method", "outcome"]) &&
        isAnalyticsSubject(properties.recordSubject) &&
        ["native", "clipboard", "manual"].includes(String(properties.method)) &&
        ["completed", "cancelled", "failed"].includes(
          String(properties.outcome),
        )
      );
    default:
      return !browserOnly && serverPropertiesAreValid(name, properties);
  }
}

function serverPropertiesAreValid(
  name: string,
  properties: Record<string, unknown>,
): boolean {
  switch (name) {
    case "determination_completed": {
      if (
        !hasOnlyKeys(properties, [
          "outcome",
          "accessKind",
          "durationMs",
          "pathCode",
          "attempts",
          "providerAttempts",
          "fallbackReason",
          "inputTokens",
          "outputTokens",
          "estimatedCostMicrousd",
          "pricingVersion",
          "model",
        ])
      )
        return false;
      if (
        ![
          "accepted_provider",
          "accepted_fallback",
          "rejected",
          "limited",
          "failed",
        ].includes(String(properties.outcome))
      )
        return false;
      if (
        !["anonymous", "evaluation", "standard"].includes(
          String(properties.accessKind),
        )
      )
        return false;
      if (!isDuration(properties.durationMs)) return false;
      if (
        properties.pathCode !== undefined &&
        !PATH_CODES.has(properties.pathCode as AnalyticsPathCode)
      )
        return false;
      if (
        properties.attempts !== undefined &&
        properties.attempts !== 1 &&
        properties.attempts !== 2
      )
        return false;
      if (
        properties.providerAttempts !== undefined &&
        ![0, 1, 2].includes(Number(properties.providerAttempts))
      )
        return false;
      if (
        properties.fallbackReason !== undefined &&
        !FALLBACK_REASONS.has(
          properties.fallbackReason as AnalyticsFallbackReason,
        )
      )
        return false;
      for (const key of [
        "inputTokens",
        "outputTokens",
        "estimatedCostMicrousd",
      ] as const) {
        const item = properties[key];
        if (item !== undefined && !isBoundedInteger(item, 100_000_000))
          return false;
      }
      return (
        optionalCode(properties.pricingVersion) &&
        optionalCode(properties.model)
      );
    }
    case "public_record_published":
      return (
        hasOnlyKeys(properties, ["outcome", "created", "recordSubject"]) &&
        ["published", "invalid", "failed"].includes(
          String(properties.outcome),
        ) &&
        (properties.created === undefined ||
          typeof properties.created === "boolean") &&
        (properties.recordSubject === undefined ||
          isAnalyticsSubject(properties.recordSubject))
      );
    case "consultation_submitted":
      return subjectOutcome(
        properties,
        ["accepted", "invalid", "unavailable", "failed"],
        "position",
        [
          "grievance_upheld",
          "grievance_dismissed",
          "upheld_with_circumstances_noted",
        ],
      );
    case "report_submitted":
      return subjectOutcome(
        properties,
        ["reported", "invalid", "unavailable", "failed"],
        "reason",
        [
          "privacy_concern",
          "harmful_content",
          "wrong_person",
          "other_safety_concern",
        ],
      );
    case "access_redeemed":
      return (
        hasOnlyKeys(properties, ["kind", "outcome", "invitationSubject"]) &&
        ["evaluation", "standard", "successor"].includes(
          String(properties.kind),
        ) &&
        [
          "accepted",
          "invalid",
          "expired",
          "claimed",
          "revoked",
          "limited",
          "unavailable",
        ].includes(String(properties.outcome)) &&
        (properties.invitationSubject === undefined ||
          isAnalyticsSubject(properties.invitationSubject))
      );
    case "successor_invitation_changed":
      return (
        hasOnlyKeys(properties, ["action", "outcome", "invitationSubject"]) &&
        ["issue", "replace", "cancel", "claim"].includes(
          String(properties.action),
        ) &&
        [
          "accepted",
          "issued",
          "cancelled",
          "invalid",
          "expired",
          "claimed",
          "revoked",
          "limited",
          "transferred",
          "not_eligible",
          "exhausted",
          "pending",
          "not_pending",
          "disabled",
          "unavailable",
        ].includes(String(properties.outcome)) &&
        (properties.invitationSubject === undefined ||
          isAnalyticsSubject(properties.invitationSubject))
      );
    case "owner_record_changed":
      return (
        hasOnlyKeys(properties, ["action", "outcome", "recordSubject"]) &&
        ["unpublish", "restore", "delete"].includes(
          String(properties.action),
        ) &&
        [
          "updated",
          "deleted",
          "invalid",
          "unauthorized",
          "unavailable",
          "failed",
        ].includes(String(properties.outcome)) &&
        isAnalyticsSubject(properties.recordSubject)
      );
    case "operational_failure":
      return (
        hasOnlyKeys(properties, ["operation", "category"]) &&
        [
          "analytics_delivery",
          "filing_completion",
          "record_persistence",
          "consultation_persistence",
          "report_persistence",
          "access_control",
        ].includes(String(properties.operation)) &&
        [
          "configuration",
          "validation",
          "provider",
          "persistence",
          "rate_limit",
          "budget",
          "unexpected",
        ].includes(String(properties.category))
      );
    default:
      return false;
  }
}

function filingStepProperties(
  properties: Record<string, unknown>,
  completed: boolean,
): boolean {
  const keys = completed
    ? ["step", "direction", "durationMs", "pathCode"]
    : ["step", "pathCode"];
  return (
    hasOnlyKeys(properties, keys) &&
    FILING_STEPS.has(String(properties.step)) &&
    (properties.pathCode === undefined ||
      PATH_CODES.has(properties.pathCode as AnalyticsPathCode))
  );
}

function subjectOutcome(
  properties: Record<string, unknown>,
  outcomes: readonly string[],
  detailKey: "position" | "reason",
  details: readonly string[],
): boolean {
  const detail = properties[detailKey];
  return (
    hasOnlyKeys(properties, ["recordSubject", "outcome", detailKey]) &&
    isAnalyticsSubject(properties.recordSubject) &&
    outcomes.includes(String(properties.outcome)) &&
    (detail === undefined ||
      (typeof detail === "string" && details.includes(detail)))
  );
}

function exactEnum<T extends string>(
  properties: Record<string, unknown>,
  key: string,
  values: ReadonlySet<T>,
): boolean {
  return hasOnlyKeys(properties, [key]) && values.has(properties[key] as T);
}

function optionalCode(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && /^[A-Za-z0-9._:-]{1,64}$/u.test(value))
  );
}

function isDuration(value: unknown): boolean {
  return isBoundedInteger(value, 3_600_000);
}

function isBoundedInteger(value: unknown, maximum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= maximum
  );
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
import { isProductLocale, type ProductLocale } from "@/domain/locale";
