import {
  createEmptyChronologyDraft,
  type ChronologyDraft,
  type ChronologyFiling,
  type FilingError,
  validateChronologyDraft,
  validateChronologyFiling,
} from "./chronology";
import {
  createEmptyDigitalConductDraft,
  type DigitalConductDraft,
  type DigitalConductFiling,
  validateDigitalConductDraft,
  validateDigitalConductFiling,
} from "./digital-conduct";
import {
  createEmptyDomesticAffairsDraft,
  type DomesticAffairsDraft,
  type DomesticAffairsFiling,
  validateDomesticAffairsDraft,
  validateDomesticAffairsFiling,
} from "./domestic-affairs";
import {
  createEmptySocialPlanningDraft,
  type SocialPlanningDraft,
  type SocialPlanningFiling,
  validateSocialPlanningDraft,
  validateSocialPlanningFiling,
} from "./social-planning";

export const ENABLED_DEPARTMENT_CODES = [
  "chronology",
  "digital_conduct",
  "domestic_affairs",
  "social_planning",
] as const;
export type DepartmentCode = (typeof ENABLED_DEPARTMENT_CODES)[number];
export type FilingDraft =
  | ChronologyDraft
  | DigitalConductDraft
  | DomesticAffairsDraft
  | SocialPlanningDraft;
export type Filing =
  | ChronologyFiling
  | DigitalConductFiling
  | DomesticAffairsFiling
  | SocialPlanningFiling;
export type FilingValidationResult =
  | { status: "valid"; filing: Filing }
  | { status: "invalid"; errors: FilingError[] };

export function createEmptyFilingDraft(
  department: DepartmentCode = "chronology",
): FilingDraft {
  if (department === "chronology") return createEmptyChronologyDraft();
  if (department === "digital_conduct") return createEmptyDigitalConductDraft();
  return department === "domestic_affairs"
    ? createEmptyDomesticAffairsDraft()
    : createEmptySocialPlanningDraft();
}

export function switchDraftDepartment(
  draft: FilingDraft,
  department: DepartmentCode,
): FilingDraft {
  if (draft.department === department) return draft;
  return {
    ...createEmptyFilingDraft(department),
    respondent: draft.respondent,
    relationship: draft.relationship,
    statement: draft.statement,
  };
}

export function validateFilingDraft(
  value: unknown,
  locale: unknown,
): FilingValidationResult {
  if (isRecord(value) && value.department === "digital_conduct") {
    return validateDigitalConductDraft(value, locale);
  }
  if (isRecord(value) && value.department === "domestic_affairs") {
    return validateDomesticAffairsDraft(value, locale);
  }
  if (isRecord(value) && value.department === "social_planning") {
    return validateSocialPlanningDraft(value, locale);
  }
  return validateChronologyDraft(value, locale);
}

export function validateFiling(
  value: unknown,
  locale: unknown,
): FilingValidationResult {
  if (isRecord(value) && value.department === "digital_conduct") {
    return validateDigitalConductFiling(value, locale);
  }
  if (isRecord(value) && value.department === "domestic_affairs") {
    return validateDomesticAffairsFiling(value, locale);
  }
  if (isRecord(value) && value.department === "social_planning") {
    return validateSocialPlanningFiling(value, locale);
  }
  return validateChronologyFiling(value, locale);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
