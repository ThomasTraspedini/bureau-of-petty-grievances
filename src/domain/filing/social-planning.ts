import {
  RELATIONSHIP_CODES,
  containsUnnecessaryIdentifier,
  countCharacters,
  type FilingError,
  type RelationshipCode,
  validateWitnessStatement,
} from "./chronology";

export const SOCIAL_PLANNING_OFFENCE_CODES = [
  "option_veto_cycle",
  "decision_drift",
  "confirmed_plan_revision",
] as const;

export const SOCIAL_PLANNING_IMPACT_CODES = [
  "planning_stalled",
  "participants_waiting",
  "arrangements_disrupted",
  "irritation_only",
] as const;

export const SOCIAL_PLANNING_MITIGATION_CODES = [
  "offers_alternatives_sometimes",
  "confirms_when_prompted",
  "gave_some_notice",
  "usually_flexible",
] as const;

export type SocialPlanningOffenceCode =
  (typeof SOCIAL_PLANNING_OFFENCE_CODES)[number];
export type SocialPlanningImpactCode =
  (typeof SOCIAL_PLANNING_IMPACT_CODES)[number];
export type SocialPlanningMitigationCode =
  (typeof SOCIAL_PLANNING_MITIGATION_CODES)[number];

export interface SocialPlanningDraft {
  department: "social_planning";
  respondent: string;
  relationship: RelationshipCode | "";
  offence: SocialPlanningOffenceCode | "";
  facts: {
    optionVetoCycle: {
      proposedOptionCount: string;
      rejectedOptionCount: string;
      alternativeOptionCount: string;
    };
    decisionDrift: {
      decisionRoundCount: string;
      elapsedHours: string;
      participantCount: string;
    };
    confirmedPlanRevision: {
      revisionCount: string;
      participantCount: string;
      noticeHours: string;
    };
  };
  impact: SocialPlanningImpactCode | "";
  mitigation: SocialPlanningMitigationCode | "";
  statement: string;
}

interface SocialPlanningFilingCommon {
  locale: ProductLocale;
  department: "social_planning";
  respondent: string;
  relationship: RelationshipCode;
  impact: SocialPlanningImpactCode;
  mitigation: SocialPlanningMitigationCode;
  statement: string;
}

export type SocialPlanningFiling = SocialPlanningFilingCommon &
  (
    | {
        offence: "option_veto_cycle";
        facts: {
          proposedOptionCount: number;
          rejectedOptionCount: number;
          alternativeOptionCount: number;
        };
      }
    | {
        offence: "decision_drift";
        facts: {
          decisionRoundCount: number;
          elapsedHours: number;
          participantCount: number;
        };
      }
    | {
        offence: "confirmed_plan_revision";
        facts: {
          revisionCount: number;
          participantCount: number;
          noticeHours: number;
        };
      }
  );

export type SocialPlanningValidationResult =
  | { status: "valid"; filing: SocialPlanningFiling }
  | { status: "invalid"; errors: FilingError[] };

export function createEmptySocialPlanningDraft(): SocialPlanningDraft {
  return {
    department: "social_planning",
    respondent: "",
    relationship: "",
    offence: "",
    facts: {
      optionVetoCycle: {
        proposedOptionCount: "",
        rejectedOptionCount: "",
        alternativeOptionCount: "",
      },
      decisionDrift: {
        decisionRoundCount: "",
        elapsedHours: "",
        participantCount: "",
      },
      confirmedPlanRevision: {
        revisionCount: "",
        participantCount: "",
        noticeHours: "",
      },
    },
    impact: "",
    mitigation: "",
    statement: "",
  };
}

export function validateSocialPlanningDraft(
  value: unknown,
  locale: unknown,
): SocialPlanningValidationResult {
  const draft = parseSocialPlanningDraft(value);
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

  const common: SocialPlanningFilingCommon = {
    locale,
    department: "social_planning",
    respondent,
    relationship: draft.relationship,
    impact: draft.impact,
    mitigation: draft.mitigation,
    statement,
  };
  if (
    draft.offence === "option_veto_cycle" &&
    "proposedOptionCount" in facts &&
    typeof facts.rejectedOptionCount === "number" &&
    typeof facts.alternativeOptionCount === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          proposedOptionCount: facts.proposedOptionCount,
          rejectedOptionCount: facts.rejectedOptionCount,
          alternativeOptionCount: facts.alternativeOptionCount,
        },
      },
    };
  }
  if (
    draft.offence === "decision_drift" &&
    "decisionRoundCount" in facts &&
    typeof facts.elapsedHours === "number" &&
    typeof facts.participantCount === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          decisionRoundCount: facts.decisionRoundCount,
          elapsedHours: facts.elapsedHours,
          participantCount: facts.participantCount,
        },
      },
    };
  }
  if (
    draft.offence === "confirmed_plan_revision" &&
    "revisionCount" in facts &&
    typeof facts.participantCount === "number" &&
    typeof facts.noticeHours === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          revisionCount: facts.revisionCount,
          participantCount: facts.participantCount,
          noticeHours: facts.noticeHours,
        },
      },
    };
  }
  return invalidEvidence();
}

export function validateSocialPlanningFiling(
  value: unknown,
  locale: unknown,
): SocialPlanningValidationResult {
  if (
    !isRecord(value) ||
    value.department !== "social_planning" ||
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
  const draft = createEmptySocialPlanningDraft();
  draft.respondent = value.respondent;
  draft.statement = value.statement;
  draft.relationship = value.relationship;
  draft.offence = value.offence;
  draft.impact = value.impact;
  draft.mitigation = value.mitigation;
  if (
    value.offence === "option_veto_cycle" &&
    integers(value.facts, [
      "proposedOptionCount",
      "rejectedOptionCount",
      "alternativeOptionCount",
    ])
  ) {
    draft.facts.optionVetoCycle = {
      proposedOptionCount: String(value.facts.proposedOptionCount),
      rejectedOptionCount: String(value.facts.rejectedOptionCount),
      alternativeOptionCount: String(value.facts.alternativeOptionCount),
    };
  } else if (
    value.offence === "decision_drift" &&
    integers(value.facts, [
      "decisionRoundCount",
      "elapsedHours",
      "participantCount",
    ])
  ) {
    draft.facts.decisionDrift = {
      decisionRoundCount: String(value.facts.decisionRoundCount),
      elapsedHours: String(value.facts.elapsedHours),
      participantCount: String(value.facts.participantCount),
    };
  } else if (
    value.offence === "confirmed_plan_revision" &&
    integers(value.facts, ["revisionCount", "participantCount", "noticeHours"])
  ) {
    draft.facts.confirmedPlanRevision = {
      revisionCount: String(value.facts.revisionCount),
      participantCount: String(value.facts.participantCount),
      noticeHours: String(value.facts.noticeHours),
    };
  } else return invalidFiling();
  return validateSocialPlanningDraft(draft, locale);
}

export function validateSocialPlanningDraftField(
  field: FilingError["field"],
  draft: SocialPlanningDraft,
) {
  const result = validateSocialPlanningDraft(draft, "en");
  if (result.status === "valid") return null;
  return result.errors.find((error) => error.field === field)?.code ?? null;
}

function validateFacts(draft: SocialPlanningDraft, errors: FilingError[]) {
  if (draft.offence === "option_veto_cycle") {
    const proposedOptionCount = integer(
      draft.facts.optionVetoCycle.proposedOptionCount,
      2,
      20,
    );
    const rejectedOptionCount = integer(
      draft.facts.optionVetoCycle.rejectedOptionCount,
      1,
      20,
    );
    const alternativeOptionCount = integer(
      draft.facts.optionVetoCycle.alternativeOptionCount,
      0,
      10,
    );
    if (
      proposedOptionCount === null ||
      rejectedOptionCount === null ||
      alternativeOptionCount === null
    ) {
      errors.push({ field: "social_evidence", code: "invalid_duration" });
      return null;
    }
    if (rejectedOptionCount > proposedOptionCount) {
      errors.push({
        field: "social_evidence",
        code: "rejections_exceed_options",
      });
      return null;
    }
    return {
      proposedOptionCount,
      rejectedOptionCount,
      alternativeOptionCount,
    };
  }
  if (draft.offence === "decision_drift") {
    const decisionRoundCount = integer(
      draft.facts.decisionDrift.decisionRoundCount,
      2,
      12,
    );
    const elapsedHours = integer(
      draft.facts.decisionDrift.elapsedHours,
      1,
      336,
    );
    const participantCount = integer(
      draft.facts.decisionDrift.participantCount,
      2,
      20,
    );
    if (
      decisionRoundCount === null ||
      elapsedHours === null ||
      participantCount === null
    ) {
      errors.push({ field: "social_evidence", code: "invalid_duration" });
      return null;
    }
    return { decisionRoundCount, elapsedHours, participantCount };
  }
  if (draft.offence === "confirmed_plan_revision") {
    const revisionCount = integer(
      draft.facts.confirmedPlanRevision.revisionCount,
      1,
      10,
    );
    const participantCount = integer(
      draft.facts.confirmedPlanRevision.participantCount,
      2,
      20,
    );
    const noticeHours = integer(
      draft.facts.confirmedPlanRevision.noticeHours,
      0,
      168,
    );
    if (
      revisionCount === null ||
      participantCount === null ||
      noticeHours === null
    ) {
      errors.push({ field: "social_evidence", code: "invalid_duration" });
      return null;
    }
    return { revisionCount, participantCount, noticeHours };
  }
  return null;
}

function parseSocialPlanningDraft(value: unknown): SocialPlanningDraft | null {
  if (
    !isRecord(value) ||
    value.department !== "social_planning" ||
    !isRecord(value.facts)
  )
    return null;
  const veto = value.facts.optionVetoCycle;
  const drift = value.facts.decisionDrift;
  const revision = value.facts.confirmedPlanRevision;
  if (
    typeof value.respondent !== "string" ||
    typeof value.statement !== "string" ||
    !isRelationshipOrEmpty(value.relationship) ||
    !isOffenceOrEmpty(value.offence) ||
    !isImpactOrEmpty(value.impact) ||
    !isMitigationOrEmpty(value.mitigation) ||
    !isRecord(veto) ||
    !isRecord(drift) ||
    !isRecord(revision) ||
    !strings(veto, [
      "proposedOptionCount",
      "rejectedOptionCount",
      "alternativeOptionCount",
    ]) ||
    !strings(drift, [
      "decisionRoundCount",
      "elapsedHours",
      "participantCount",
    ]) ||
    !strings(revision, ["revisionCount", "participantCount", "noticeHours"])
  )
    return null;
  return value as unknown as SocialPlanningDraft;
}

function invalidFiling(): SocialPlanningValidationResult {
  return {
    status: "invalid",
    errors: [{ field: "respondent", code: "required" }],
  };
}

function invalidEvidence(): SocialPlanningValidationResult {
  return {
    status: "invalid",
    errors: [{ field: "social_evidence", code: "invalid_duration" }],
  };
}

function integer(value: string, min: number, max: number): number | null {
  if (!/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function integers(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every((key) => Number.isSafeInteger(value[key]));
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

function isOffence(value: unknown): value is SocialPlanningOffenceCode {
  return (
    typeof value === "string" &&
    SOCIAL_PLANNING_OFFENCE_CODES.some((code) => code === value)
  );
}

function isOffenceOrEmpty(
  value: unknown,
): value is SocialPlanningOffenceCode | "" {
  return value === "" || isOffence(value);
}

function isImpact(value: unknown): value is SocialPlanningImpactCode {
  return (
    typeof value === "string" &&
    SOCIAL_PLANNING_IMPACT_CODES.some((code) => code === value)
  );
}

function isImpactOrEmpty(
  value: unknown,
): value is SocialPlanningImpactCode | "" {
  return value === "" || isImpact(value);
}

function isMitigation(value: unknown): value is SocialPlanningMitigationCode {
  return (
    typeof value === "string" &&
    SOCIAL_PLANNING_MITIGATION_CODES.some((code) => code === value)
  );
}

function isMitigationOrEmpty(
  value: unknown,
): value is SocialPlanningMitigationCode | "" {
  return value === "" || isMitigation(value);
}
import { isProductLocale, type ProductLocale } from "@/domain/locale";
