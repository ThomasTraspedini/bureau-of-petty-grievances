export const RELATIONSHIP_CODES = [
  "friend",
  "partner",
  "roommate",
  "colleague",
  "sibling",
] as const;

export const CHRONOLOGY_OFFENCE_CODES = [
  "premature_departure",
  "chronic_lateness",
  "optimistic_estimate",
] as const;

export const IMPACT_CODES = [
  "table_held",
  "repeated_updates",
  "plans_compressed",
  "irritation_only",
] as const;

export const MITIGATION_CODES = [
  "brings_dessert",
  "apologizes",
  "helps_others",
  "useful_warning",
] as const;

export type RelationshipCode = (typeof RELATIONSHIP_CODES)[number];
export type ChronologyOffenceCode = (typeof CHRONOLOGY_OFFENCE_CODES)[number];
export type ImpactCode = (typeof IMPACT_CODES)[number];
export type MitigationCode = (typeof MITIGATION_CODES)[number];

export interface ChronologyDraft {
  department: "chronology";
  respondent: string;
  relationship: RelationshipCode | "";
  offence: ChronologyOffenceCode | "";
  facts: {
    prematureDeparture: {
      declaredTime: string;
      delayMinutes: string;
    };
    chronicLateness: {
      agreedTime: string;
      delayMinutes: string;
    };
    optimisticEstimate: {
      estimatedMinutes: string;
      actualMinutes: string;
    };
  };
  impact: ImpactCode | "";
  mitigation: MitigationCode | "";
  statement: string;
}

interface FilingCommon {
  locale: ProductLocale;
  department: "chronology";
  respondent: string;
  relationship: RelationshipCode;
  impact: ImpactCode;
  mitigation: MitigationCode;
  statement: string;
}

export type ChronologyFiling = FilingCommon &
  (
    | {
        offence: "premature_departure";
        facts: { declaredTime: string; delayMinutes: number };
      }
    | {
        offence: "chronic_lateness";
        facts: { agreedTime: string; delayMinutes: number };
      }
    | {
        offence: "optimistic_estimate";
        facts: { estimatedMinutes: number; actualMinutes: number };
      }
  );

export type FilingField =
  | "department"
  | "respondent"
  | "relationship"
  | "offence"
  | "chronology"
  | "communications"
  | "domestic_evidence"
  | "social_evidence"
  | "impact"
  | "mitigation"
  | "statement";

export type FilingErrorCode =
  | "required"
  | "alias_too_long"
  | "unnecessary_identifier"
  | "invalid_time"
  | "invalid_duration"
  | "estimate_not_exceeded"
  | "ratio_not_exceeded"
  | "follow_up_required"
  | "remainder_not_smaller"
  | "rejections_exceed_options"
  | "statement_too_long"
  | "restricted_content"
  | "invalid_selection";

export interface FilingError {
  field: FilingField;
  code: FilingErrorCode;
}

export type FilingValidationResult =
  | { status: "valid"; filing: ChronologyFiling }
  | { status: "invalid"; errors: FilingError[] };

export function createEmptyChronologyDraft(): ChronologyDraft {
  return {
    department: "chronology",
    respondent: "",
    relationship: "",
    offence: "",
    facts: {
      prematureDeparture: { declaredTime: "", delayMinutes: "" },
      chronicLateness: { agreedTime: "", delayMinutes: "" },
      optimisticEstimate: { estimatedMinutes: "", actualMinutes: "" },
    },
    impact: "",
    mitigation: "",
    statement: "",
  };
}

export function validateChronologyDraft(
  value: unknown,
  locale: unknown,
): FilingValidationResult {
  const draft = parseChronologyDraft(value);
  if (!draft || !isProductLocale(locale)) {
    return {
      status: "invalid",
      errors: [{ field: "respondent", code: "required" }],
    };
  }

  const errors: FilingError[] = [];
  const respondent = draft.respondent.trim();
  const statement = draft.statement.trim();

  if (respondent.length === 0) {
    errors.push({ field: "respondent", code: "required" });
  } else if (countCharacters(respondent) > 32) {
    errors.push({ field: "respondent", code: "alias_too_long" });
  } else if (containsUnnecessaryIdentifier(respondent)) {
    errors.push({ field: "respondent", code: "unnecessary_identifier" });
  }

  if (!draft.relationship) {
    errors.push({ field: "relationship", code: "invalid_selection" });
  }
  if (!draft.offence) {
    errors.push({ field: "offence", code: "invalid_selection" });
  }

  const facts = validateFacts(draft, errors);

  if (!draft.impact) {
    errors.push({ field: "impact", code: "invalid_selection" });
  }
  if (!draft.mitigation) {
    errors.push({ field: "mitigation", code: "required" });
  }

  const statementError = validateWitnessStatement(statement);
  if (statementError) {
    errors.push({ field: "statement", code: statementError });
  }

  if (
    errors.length > 0 ||
    !draft.relationship ||
    !draft.offence ||
    !facts ||
    !draft.impact ||
    !draft.mitigation
  ) {
    return { status: "invalid", errors };
  }

  const common: FilingCommon = {
    locale,
    department: "chronology",
    respondent,
    relationship: draft.relationship,
    impact: draft.impact,
    mitigation: draft.mitigation,
    statement,
  };

  if (draft.offence === "premature_departure" && "declaredTime" in facts) {
    return {
      status: "valid",
      filing: { ...common, offence: draft.offence, facts },
    };
  }
  if (draft.offence === "chronic_lateness" && "agreedTime" in facts) {
    return {
      status: "valid",
      filing: { ...common, offence: draft.offence, facts },
    };
  }
  if (draft.offence === "optimistic_estimate" && "estimatedMinutes" in facts) {
    return {
      status: "valid",
      filing: { ...common, offence: draft.offence, facts },
    };
  }

  return {
    status: "invalid",
    errors: [{ field: "chronology", code: "invalid_duration" }],
  };
}

export function validateChronologyFiling(
  value: unknown,
  locale: unknown,
): FilingValidationResult {
  if (
    !isRecord(value) ||
    !hasExactly(value, [
      "locale",
      "department",
      "respondent",
      "relationship",
      "offence",
      "facts",
      "impact",
      "mitigation",
      "statement",
    ]) ||
    !isProductLocale(value.locale) ||
    value.department !== "chronology" ||
    locale !== value.locale ||
    typeof value.respondent !== "string" ||
    !isRelationship(value.relationship) ||
    value.relationship === "" ||
    !isOffence(value.offence) ||
    value.offence === "" ||
    !isImpact(value.impact) ||
    value.impact === "" ||
    !isMitigation(value.mitigation) ||
    value.mitigation === "" ||
    typeof value.statement !== "string" ||
    !isRecord(value.facts)
  ) {
    return invalidNormalizedFiling();
  }

  const draft = createEmptyChronologyDraft();
  draft.respondent = value.respondent;
  draft.relationship = value.relationship;
  draft.offence = value.offence;
  draft.impact = value.impact;
  draft.mitigation = value.mitigation;
  draft.statement = value.statement;
  if (
    value.offence === "premature_departure" &&
    hasExactly(value.facts, ["declaredTime", "delayMinutes"]) &&
    typeof value.facts.declaredTime === "string" &&
    isSafeInteger(value.facts.delayMinutes)
  ) {
    draft.facts.prematureDeparture = {
      declaredTime: value.facts.declaredTime,
      delayMinutes: String(value.facts.delayMinutes),
    };
  } else if (
    value.offence === "chronic_lateness" &&
    hasExactly(value.facts, ["agreedTime", "delayMinutes"]) &&
    typeof value.facts.agreedTime === "string" &&
    isSafeInteger(value.facts.delayMinutes)
  ) {
    draft.facts.chronicLateness = {
      agreedTime: value.facts.agreedTime,
      delayMinutes: String(value.facts.delayMinutes),
    };
  } else if (
    value.offence === "optimistic_estimate" &&
    hasExactly(value.facts, ["estimatedMinutes", "actualMinutes"]) &&
    isSafeInteger(value.facts.estimatedMinutes) &&
    isSafeInteger(value.facts.actualMinutes)
  ) {
    draft.facts.optimisticEstimate = {
      estimatedMinutes: String(value.facts.estimatedMinutes),
      actualMinutes: String(value.facts.actualMinutes),
    };
  } else {
    return invalidNormalizedFiling();
  }
  return validateChronologyDraft(draft, locale);
}

export function validateDraftField(
  field: FilingField,
  draft: ChronologyDraft,
): FilingErrorCode | null {
  const result = validateChronologyDraft(draft, "en");
  if (result.status === "valid") return null;
  return result.errors.find((error) => error.field === field)?.code ?? null;
}

export function validateWitnessStatement(
  value: string,
): FilingErrorCode | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "required";
  if (countCharacters(trimmed) > 160) return "statement_too_long";
  if (containsUnnecessaryIdentifier(trimmed)) return "unnecessary_identifier";
  if (containsRestrictedContent(trimmed)) return "restricted_content";
  return null;
}

export function containsUnnecessaryIdentifier(value: string): boolean {
  const email = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u;
  const url = /\b(?:https?:\/\/|www\.)\S+/iu;
  const handle = /(^|\s)@[a-z0-9_]{2,}/iu;
  const phone = /(?:\+?\d[\s().-]*){7,}/u;
  return (
    email.test(value) ||
    url.test(value) ||
    handle.test(value) ||
    phone.test(value)
  );
}

export function containsRestrictedContent(value: string): boolean {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en");
  const terms = [
    "abuse",
    "abusive",
    "assault",
    "attack",
    "attacked",
    "child",
    "coercion",
    "diagnosis",
    "diagnosed",
    "minor",
    "rape",
    "racist",
    "self harm",
    "stalk",
    "suicide",
    "threat",
    "violence",
    "violent",
  ];
  return terms.some((term) => normalized.includes(term));
}

export function countCharacters(value: string, locale = "en"): number {
  const segments = new Intl.Segmenter(locale, {
    granularity: "grapheme",
  }).segment(value);
  return Array.from(segments).length;
}

function validateFacts(
  draft: ChronologyDraft,
  errors: FilingError[],
):
  | { declaredTime: string; delayMinutes: number }
  | { agreedTime: string; delayMinutes: number }
  | { estimatedMinutes: number; actualMinutes: number }
  | null {
  if (draft.offence === "premature_departure") {
    const { declaredTime, delayMinutes } = draft.facts.prematureDeparture;
    const delay = parseBoundedInteger(delayMinutes, 1, 180);
    if (!isTime(declaredTime))
      errors.push({ field: "chronology", code: "invalid_time" });
    if (delay === null)
      errors.push({ field: "chronology", code: "invalid_duration" });
    return isTime(declaredTime) && delay !== null
      ? { declaredTime, delayMinutes: delay }
      : null;
  }

  if (draft.offence === "chronic_lateness") {
    const { agreedTime, delayMinutes } = draft.facts.chronicLateness;
    const delay = parseBoundedInteger(delayMinutes, 1, 180);
    if (!isTime(agreedTime))
      errors.push({ field: "chronology", code: "invalid_time" });
    if (delay === null)
      errors.push({ field: "chronology", code: "invalid_duration" });
    return isTime(agreedTime) && delay !== null
      ? { agreedTime, delayMinutes: delay }
      : null;
  }

  if (draft.offence === "optimistic_estimate") {
    const { estimatedMinutes, actualMinutes } = draft.facts.optimisticEstimate;
    const estimate = parseBoundedInteger(estimatedMinutes, 1, 180);
    const actual = parseBoundedInteger(actualMinutes, 2, 360);
    if (estimate === null || actual === null) {
      errors.push({ field: "chronology", code: "invalid_duration" });
      return null;
    }
    if (actual <= estimate) {
      errors.push({ field: "chronology", code: "estimate_not_exceeded" });
      return null;
    }
    return { estimatedMinutes: estimate, actualMinutes: actual };
  }

  return null;
}

function parseChronologyDraft(value: unknown): ChronologyDraft | null {
  if (!isRecord(value) || !isRecord(value.facts)) return null;
  const premature = value.facts.prematureDeparture;
  const late = value.facts.chronicLateness;
  const estimate = value.facts.optimisticEstimate;
  if (!isRecord(premature) || !isRecord(late) || !isRecord(estimate))
    return null;

  if (
    (value.department !== undefined && value.department !== "chronology") ||
    typeof value.respondent !== "string" ||
    !isRelationship(value.relationship) ||
    !isOffence(value.offence) ||
    !isImpact(value.impact) ||
    !isMitigation(value.mitigation) ||
    typeof value.statement !== "string" ||
    typeof premature.declaredTime !== "string" ||
    typeof premature.delayMinutes !== "string" ||
    typeof late.agreedTime !== "string" ||
    typeof late.delayMinutes !== "string" ||
    typeof estimate.estimatedMinutes !== "string" ||
    typeof estimate.actualMinutes !== "string"
  ) {
    return null;
  }

  return {
    department: "chronology",
    respondent: value.respondent,
    relationship: value.relationship,
    offence: value.offence,
    facts: {
      prematureDeparture: {
        declaredTime: premature.declaredTime,
        delayMinutes: premature.delayMinutes,
      },
      chronicLateness: {
        agreedTime: late.agreedTime,
        delayMinutes: late.delayMinutes,
      },
      optimisticEstimate: {
        estimatedMinutes: estimate.estimatedMinutes,
        actualMinutes: estimate.actualMinutes,
      },
    },
    impact: value.impact,
    mitigation: value.mitigation,
    statement: value.statement,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactly(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function invalidNormalizedFiling(): FilingValidationResult {
  return {
    status: "invalid",
    errors: [{ field: "respondent", code: "required" }],
  };
}

function isRelationship(value: unknown): value is RelationshipCode | "" {
  return value === "" || RELATIONSHIP_CODES.some((code) => code === value);
}

function isOffence(value: unknown): value is ChronologyOffenceCode | "" {
  return (
    value === "" || CHRONOLOGY_OFFENCE_CODES.some((code) => code === value)
  );
}

function isImpact(value: unknown): value is ImpactCode | "" {
  return value === "" || IMPACT_CODES.some((code) => code === value);
}

function isMitigation(value: unknown): value is MitigationCode | "" {
  return value === "" || MITIGATION_CODES.some((code) => code === value);
}

function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value);
}

function parseBoundedInteger(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!/^\d+$/u.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum
    ? number
    : null;
}
import { isProductLocale, type ProductLocale } from "@/domain/locale";
