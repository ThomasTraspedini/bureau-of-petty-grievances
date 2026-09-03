import {
  RELATIONSHIP_CODES,
  containsUnnecessaryIdentifier,
  countCharacters,
  type FilingError,
  type RelationshipCode,
  validateWitnessStatement,
} from "./chronology";

export const DOMESTIC_AFFAIRS_OFFENCE_CODES = [
  "token_remainder",
  "misplaced_object",
  "empty_packaging",
] as const;

export const DOMESTIC_AFFAIRS_IMPACT_CODES = [
  "needed_item_unavailable",
  "shared_space_obstructed",
  "false_stock_signal",
  "irritation_only",
] as const;

export const DOMESTIC_AFFAIRS_MITIGATION_CODES = [
  "usually_restocks",
  "corrects_when_asked",
  "handles_other_chores",
  "usually_orderly",
] as const;

export type DomesticAffairsOffenceCode =
  (typeof DOMESTIC_AFFAIRS_OFFENCE_CODES)[number];
export type DomesticAffairsImpactCode =
  (typeof DOMESTIC_AFFAIRS_IMPACT_CODES)[number];
export type DomesticAffairsMitigationCode =
  (typeof DOMESTIC_AFFAIRS_MITIGATION_CODES)[number];

export interface DomesticAffairsDraft {
  department: "domestic_affairs";
  respondent: string;
  relationship: RelationshipCode | "";
  offence: DomesticAffairsOffenceCode | "";
  facts: {
    tokenRemainder: {
      remainingServings: string;
      capacityServings: string;
    };
    misplacedObject: {
      itemCount: string;
      distanceSteps: string;
      correctionSeconds: string;
    };
    emptyPackaging: {
      emptyPackageCount: string;
      recurrencesInThirtyDays: string;
    };
  };
  impact: DomesticAffairsImpactCode | "";
  mitigation: DomesticAffairsMitigationCode | "";
  statement: string;
}

interface DomesticAffairsFilingCommon {
  locale: ProductLocale;
  department: "domestic_affairs";
  respondent: string;
  relationship: RelationshipCode;
  impact: DomesticAffairsImpactCode;
  mitigation: DomesticAffairsMitigationCode;
  statement: string;
}

export type DomesticAffairsFiling = DomesticAffairsFilingCommon &
  (
    | {
        offence: "token_remainder";
        facts: { remainingServings: number; capacityServings: number };
      }
    | {
        offence: "misplaced_object";
        facts: {
          itemCount: number;
          distanceSteps: number;
          correctionSeconds: number;
        };
      }
    | {
        offence: "empty_packaging";
        facts: {
          emptyPackageCount: number;
          recurrencesInThirtyDays: number;
        };
      }
  );

export type DomesticAffairsValidationResult =
  | { status: "valid"; filing: DomesticAffairsFiling }
  | { status: "invalid"; errors: FilingError[] };

export function createEmptyDomesticAffairsDraft(): DomesticAffairsDraft {
  return {
    department: "domestic_affairs",
    respondent: "",
    relationship: "",
    offence: "",
    facts: {
      tokenRemainder: { remainingServings: "", capacityServings: "" },
      misplacedObject: {
        itemCount: "",
        distanceSteps: "",
        correctionSeconds: "",
      },
      emptyPackaging: {
        emptyPackageCount: "",
        recurrencesInThirtyDays: "",
      },
    },
    impact: "",
    mitigation: "",
    statement: "",
  };
}

export function validateDomesticAffairsDraft(
  value: unknown,
  locale: unknown,
): DomesticAffairsValidationResult {
  const draft = parseDomesticAffairsDraft(value);
  if (!draft || !isProductLocale(locale)) return invalidFiling();

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
  if (!draft.relationship)
    errors.push({ field: "relationship", code: "invalid_selection" });
  if (!draft.offence)
    errors.push({ field: "offence", code: "invalid_selection" });
  const facts = validateFacts(draft, errors);
  if (!draft.impact)
    errors.push({ field: "impact", code: "invalid_selection" });
  if (!draft.mitigation) errors.push({ field: "mitigation", code: "required" });
  const statementError = validateWitnessStatement(statement);
  if (statementError) errors.push({ field: "statement", code: statementError });

  if (
    errors.length > 0 ||
    !draft.relationship ||
    !draft.offence ||
    !facts ||
    !draft.impact ||
    !draft.mitigation
  )
    return { status: "invalid", errors };

  const common: DomesticAffairsFilingCommon = {
    locale,
    department: "domestic_affairs",
    respondent,
    relationship: draft.relationship,
    impact: draft.impact,
    mitigation: draft.mitigation,
    statement,
  };
  if (
    draft.offence === "token_remainder" &&
    "remainingServings" in facts &&
    typeof facts.remainingServings === "number" &&
    typeof facts.capacityServings === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          remainingServings: facts.remainingServings,
          capacityServings: facts.capacityServings,
        },
      },
    };
  }
  if (
    draft.offence === "misplaced_object" &&
    "itemCount" in facts &&
    typeof facts.itemCount === "number" &&
    typeof facts.distanceSteps === "number" &&
    typeof facts.correctionSeconds === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          itemCount: facts.itemCount,
          distanceSteps: facts.distanceSteps,
          correctionSeconds: facts.correctionSeconds,
        },
      },
    };
  }
  if (
    draft.offence === "empty_packaging" &&
    "emptyPackageCount" in facts &&
    typeof facts.emptyPackageCount === "number" &&
    typeof facts.recurrencesInThirtyDays === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          emptyPackageCount: facts.emptyPackageCount,
          recurrencesInThirtyDays: facts.recurrencesInThirtyDays,
        },
      },
    };
  }
  return {
    status: "invalid",
    errors: [{ field: "domestic_evidence", code: "invalid_duration" }],
  };
}

export function validateDomesticAffairsFiling(
  value: unknown,
  locale: unknown,
): DomesticAffairsValidationResult {
  if (
    !isRecord(value) ||
    value.department !== "domestic_affairs" ||
    !isProductLocale(value.locale) ||
    value.locale !== locale
  )
    return invalidFiling();
  if (
    typeof value.respondent !== "string" ||
    typeof value.statement !== "string" ||
    !isRelationship(value.relationship) ||
    !isOffence(value.offence) ||
    !isImpact(value.impact) ||
    !isMitigation(value.mitigation) ||
    !isRecord(value.facts)
  )
    return invalidFiling();
  const draft = createEmptyDomesticAffairsDraft();
  draft.respondent = value.respondent;
  draft.statement = value.statement;
  draft.relationship = value.relationship;
  draft.offence = value.offence;
  draft.impact = value.impact;
  draft.mitigation = value.mitigation;
  if (
    value.offence === "token_remainder" &&
    isInteger(value.facts.remainingServings) &&
    isInteger(value.facts.capacityServings)
  ) {
    draft.facts.tokenRemainder = {
      remainingServings: String(value.facts.remainingServings),
      capacityServings: String(value.facts.capacityServings),
    };
  } else if (
    value.offence === "misplaced_object" &&
    isInteger(value.facts.itemCount) &&
    isInteger(value.facts.distanceSteps) &&
    isInteger(value.facts.correctionSeconds)
  ) {
    draft.facts.misplacedObject = {
      itemCount: String(value.facts.itemCount),
      distanceSteps: String(value.facts.distanceSteps),
      correctionSeconds: String(value.facts.correctionSeconds),
    };
  } else if (
    value.offence === "empty_packaging" &&
    isInteger(value.facts.emptyPackageCount) &&
    isInteger(value.facts.recurrencesInThirtyDays)
  ) {
    draft.facts.emptyPackaging = {
      emptyPackageCount: String(value.facts.emptyPackageCount),
      recurrencesInThirtyDays: String(value.facts.recurrencesInThirtyDays),
    };
  } else return invalidFiling();
  return validateDomesticAffairsDraft(draft, locale);
}

export function validateDomesticAffairsDraftField(
  field: FilingError["field"],
  draft: DomesticAffairsDraft,
) {
  const result = validateDomesticAffairsDraft(draft, "en");
  if (result.status === "valid") return null;
  return result.errors.find((error) => error.field === field)?.code ?? null;
}

function validateFacts(draft: DomesticAffairsDraft, errors: FilingError[]) {
  if (draft.offence === "token_remainder") {
    const remainingServings = integer(
      draft.facts.tokenRemainder.remainingServings,
      1,
      5,
    );
    const capacityServings = integer(
      draft.facts.tokenRemainder.capacityServings,
      2,
      24,
    );
    if (remainingServings === null || capacityServings === null) {
      errors.push({ field: "domestic_evidence", code: "invalid_duration" });
      return null;
    }
    if (remainingServings >= capacityServings) {
      errors.push({
        field: "domestic_evidence",
        code: "remainder_not_smaller",
      });
      return null;
    }
    return { remainingServings, capacityServings };
  }
  if (draft.offence === "misplaced_object") {
    const itemCount = integer(draft.facts.misplacedObject.itemCount, 1, 20);
    const distanceSteps = integer(
      draft.facts.misplacedObject.distanceSteps,
      1,
      50,
    );
    const correctionSeconds = integer(
      draft.facts.misplacedObject.correctionSeconds,
      1,
      300,
    );
    if (
      itemCount === null ||
      distanceSteps === null ||
      correctionSeconds === null
    ) {
      errors.push({ field: "domestic_evidence", code: "invalid_duration" });
      return null;
    }
    return { itemCount, distanceSteps, correctionSeconds };
  }
  if (draft.offence === "empty_packaging") {
    const emptyPackageCount = integer(
      draft.facts.emptyPackaging.emptyPackageCount,
      1,
      10,
    );
    const recurrencesInThirtyDays = integer(
      draft.facts.emptyPackaging.recurrencesInThirtyDays,
      1,
      30,
    );
    if (emptyPackageCount === null || recurrencesInThirtyDays === null) {
      errors.push({ field: "domestic_evidence", code: "invalid_duration" });
      return null;
    }
    return { emptyPackageCount, recurrencesInThirtyDays };
  }
  return null;
}

function parseDomesticAffairsDraft(
  value: unknown,
): DomesticAffairsDraft | null {
  if (
    !isRecord(value) ||
    value.department !== "domestic_affairs" ||
    !isRecord(value.facts)
  )
    return null;
  const remainder = value.facts.tokenRemainder;
  const object = value.facts.misplacedObject;
  const packaging = value.facts.emptyPackaging;
  if (
    typeof value.respondent !== "string" ||
    typeof value.statement !== "string" ||
    !isRelationshipOrEmpty(value.relationship) ||
    !isOffenceOrEmpty(value.offence) ||
    !isImpactOrEmpty(value.impact) ||
    !isMitigationOrEmpty(value.mitigation) ||
    !isRecord(remainder) ||
    !isRecord(object) ||
    !isRecord(packaging) ||
    !strings(remainder, ["remainingServings", "capacityServings"]) ||
    !strings(object, ["itemCount", "distanceSteps", "correctionSeconds"]) ||
    !strings(packaging, ["emptyPackageCount", "recurrencesInThirtyDays"])
  )
    return null;
  return value as unknown as DomesticAffairsDraft;
}

function invalidFiling(): DomesticAffairsValidationResult {
  return {
    status: "invalid",
    errors: [{ field: "respondent", code: "required" }],
  };
}

function integer(value: string, min: number, max: number): number | null {
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => typeof value[key] === "string");
}

function isRelationship(value: unknown): value is RelationshipCode {
  return (
    typeof value === "string" &&
    RELATIONSHIP_CODES.some((code) => code === value)
  );
}

function isRelationshipOrEmpty(value: unknown): value is RelationshipCode | "" {
  return value === "" || isRelationship(value);
}

function isOffence(value: unknown): value is DomesticAffairsOffenceCode {
  return (
    typeof value === "string" &&
    DOMESTIC_AFFAIRS_OFFENCE_CODES.some((code) => code === value)
  );
}

function isOffenceOrEmpty(
  value: unknown,
): value is DomesticAffairsOffenceCode | "" {
  return value === "" || isOffence(value);
}

function isImpact(value: unknown): value is DomesticAffairsImpactCode {
  return (
    typeof value === "string" &&
    DOMESTIC_AFFAIRS_IMPACT_CODES.some((code) => code === value)
  );
}

function isImpactOrEmpty(
  value: unknown,
): value is DomesticAffairsImpactCode | "" {
  return value === "" || isImpact(value);
}

function isMitigation(value: unknown): value is DomesticAffairsMitigationCode {
  return (
    typeof value === "string" &&
    DOMESTIC_AFFAIRS_MITIGATION_CODES.some((code) => code === value)
  );
}

function isMitigationOrEmpty(
  value: unknown,
): value is DomesticAffairsMitigationCode | "" {
  return value === "" || isMitigation(value);
}
import { isProductLocale, type ProductLocale } from "@/domain/locale";
