import {
  RELATIONSHIP_CODES,
  containsUnnecessaryIdentifier,
  countCharacters,
  type FilingError,
  type RelationshipCode,
  validateWitnessStatement,
} from "./chronology";

export const DIGITAL_CONDUCT_OFFENCE_CODES = [
  "fragmented_messages",
  "excessive_voice_note",
  "unacknowledged_coordination",
] as const;

export const DIGITAL_CONDUCT_IMPACT_CODES = [
  "notification_burden",
  "coordination_delayed",
  "attention_fragmented",
  "irritation_only",
] as const;

export const DIGITAL_CONDUCT_MITIGATION_CODES = [
  "provides_summary",
  "acknowledges_delay",
  "usually_clear",
  "helps_coordinate",
] as const;

export type DigitalConductOffenceCode =
  (typeof DIGITAL_CONDUCT_OFFENCE_CODES)[number];
export type DigitalConductImpactCode =
  (typeof DIGITAL_CONDUCT_IMPACT_CODES)[number];
export type DigitalConductMitigationCode =
  (typeof DIGITAL_CONDUCT_MITIGATION_CODES)[number];

export interface DigitalConductDraft {
  department: "digital_conduct";
  respondent: string;
  relationship: RelationshipCode | "";
  offence: DigitalConductOffenceCode | "";
  facts: {
    fragmentedMessages: {
      messageCount: string;
      ideaCount: string;
      burstMinutes: string;
    };
    excessiveVoiceNote: {
      durationMinutes: string;
      ideaCount: string;
    };
    unacknowledgedCoordination: {
      responseHours: string;
      followUpCount: string;
    };
  };
  impact: DigitalConductImpactCode | "";
  mitigation: DigitalConductMitigationCode | "";
  statement: string;
}

interface DigitalConductFilingCommon {
  locale: "en";
  department: "digital_conduct";
  respondent: string;
  relationship: RelationshipCode;
  impact: DigitalConductImpactCode;
  mitigation: DigitalConductMitigationCode;
  statement: string;
}

export type DigitalConductFiling = DigitalConductFilingCommon &
  (
    | {
        offence: "fragmented_messages";
        facts: {
          messageCount: number;
          ideaCount: number;
          burstMinutes: number;
        };
      }
    | {
        offence: "excessive_voice_note";
        facts: { durationMinutes: number; ideaCount: number };
      }
    | {
        offence: "unacknowledged_coordination";
        facts: { responseHours: number; followUpCount: number };
      }
  );

export type DigitalConductValidationResult =
  | { status: "valid"; filing: DigitalConductFiling }
  | { status: "invalid"; errors: FilingError[] };

export function createEmptyDigitalConductDraft(): DigitalConductDraft {
  return {
    department: "digital_conduct",
    respondent: "",
    relationship: "",
    offence: "",
    facts: {
      fragmentedMessages: {
        messageCount: "",
        ideaCount: "",
        burstMinutes: "",
      },
      excessiveVoiceNote: { durationMinutes: "", ideaCount: "" },
      unacknowledgedCoordination: { responseHours: "", followUpCount: "" },
    },
    impact: "",
    mitigation: "",
    statement: "",
  };
}

export function validateDigitalConductDraft(
  value: unknown,
  locale: unknown,
): DigitalConductValidationResult {
  const draft = parseDigitalConductDraft(value);
  if (!draft || locale !== "en") return invalidFiling();

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
  ) {
    return { status: "invalid", errors };
  }

  const common: DigitalConductFilingCommon = {
    locale: "en",
    department: "digital_conduct",
    respondent,
    relationship: draft.relationship,
    impact: draft.impact,
    mitigation: draft.mitigation,
    statement,
  };
  if (
    draft.offence === "fragmented_messages" &&
    "messageCount" in facts &&
    typeof facts.messageCount === "number" &&
    typeof facts.ideaCount === "number" &&
    typeof facts.burstMinutes === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          messageCount: facts.messageCount,
          ideaCount: facts.ideaCount,
          burstMinutes: facts.burstMinutes,
        },
      },
    };
  }
  if (
    draft.offence === "excessive_voice_note" &&
    "durationMinutes" in facts &&
    typeof facts.durationMinutes === "number" &&
    typeof facts.ideaCount === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          durationMinutes: facts.durationMinutes,
          ideaCount: facts.ideaCount,
        },
      },
    };
  }
  if (
    draft.offence === "unacknowledged_coordination" &&
    "responseHours" in facts &&
    typeof facts.responseHours === "number" &&
    typeof facts.followUpCount === "number"
  ) {
    return {
      status: "valid",
      filing: {
        ...common,
        offence: draft.offence,
        facts: {
          responseHours: facts.responseHours,
          followUpCount: facts.followUpCount,
        },
      },
    };
  }
  return {
    status: "invalid",
    errors: [{ field: "communications", code: "invalid_duration" }],
  };
}

export function validateDigitalConductFiling(
  value: unknown,
  locale: unknown,
): DigitalConductValidationResult {
  if (!isRecord(value) || value.department !== "digital_conduct") {
    return invalidFiling();
  }
  const draft = createEmptyDigitalConductDraft();
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
  draft.respondent = value.respondent;
  draft.statement = value.statement;
  draft.relationship = value.relationship;
  draft.offence = value.offence;
  draft.impact = value.impact;
  draft.mitigation = value.mitigation;
  if (
    value.offence === "fragmented_messages" &&
    isInteger(value.facts.messageCount) &&
    isInteger(value.facts.ideaCount) &&
    isInteger(value.facts.burstMinutes)
  ) {
    draft.facts.fragmentedMessages = {
      messageCount: String(value.facts.messageCount),
      ideaCount: String(value.facts.ideaCount),
      burstMinutes: String(value.facts.burstMinutes),
    };
  } else if (
    value.offence === "excessive_voice_note" &&
    isInteger(value.facts.durationMinutes) &&
    isInteger(value.facts.ideaCount)
  ) {
    draft.facts.excessiveVoiceNote = {
      durationMinutes: String(value.facts.durationMinutes),
      ideaCount: String(value.facts.ideaCount),
    };
  } else if (
    value.offence === "unacknowledged_coordination" &&
    isInteger(value.facts.responseHours) &&
    isInteger(value.facts.followUpCount)
  ) {
    draft.facts.unacknowledgedCoordination = {
      responseHours: String(value.facts.responseHours),
      followUpCount: String(value.facts.followUpCount),
    };
  } else return invalidFiling();
  return validateDigitalConductDraft(draft, locale);
}

export function validateDigitalConductDraftField(
  field: FilingError["field"],
  draft: DigitalConductDraft,
) {
  const result = validateDigitalConductDraft(draft, "en");
  if (result.status === "valid") return null;
  return result.errors.find((error) => error.field === field)?.code ?? null;
}

function validateFacts(draft: DigitalConductDraft, errors: FilingError[]) {
  if (draft.offence === "fragmented_messages") {
    const source = draft.facts.fragmentedMessages;
    const messageCount = integer(source.messageCount, 2, 40);
    const ideaCount = integer(source.ideaCount, 1, 10);
    const burstMinutes = integer(source.burstMinutes, 1, 60);
    if (messageCount === null || ideaCount === null || burstMinutes === null) {
      errors.push({ field: "communications", code: "invalid_duration" });
      return null;
    }
    if (messageCount <= ideaCount) {
      errors.push({ field: "communications", code: "ratio_not_exceeded" });
      return null;
    }
    return { messageCount, ideaCount, burstMinutes };
  }
  if (draft.offence === "excessive_voice_note") {
    const durationMinutes = integer(
      draft.facts.excessiveVoiceNote.durationMinutes,
      2,
      60,
    );
    const ideaCount = integer(draft.facts.excessiveVoiceNote.ideaCount, 1, 10);
    if (durationMinutes === null || ideaCount === null) {
      errors.push({ field: "communications", code: "invalid_duration" });
      return null;
    }
    return { durationMinutes, ideaCount };
  }
  if (draft.offence === "unacknowledged_coordination") {
    const responseHours = integer(
      draft.facts.unacknowledgedCoordination.responseHours,
      1,
      168,
    );
    const followUpCount = integer(
      draft.facts.unacknowledgedCoordination.followUpCount,
      1,
      10,
    );
    if (responseHours === null || followUpCount === null) {
      errors.push({
        field: "communications",
        code:
          draft.facts.unacknowledgedCoordination.followUpCount.trim() === "0"
            ? "follow_up_required"
            : "invalid_duration",
      });
      return null;
    }
    return { responseHours, followUpCount };
  }
  return null;
}

function parseDigitalConductDraft(value: unknown): DigitalConductDraft | null {
  if (
    !isRecord(value) ||
    value.department !== "digital_conduct" ||
    !isRecord(value.facts)
  )
    return null;
  const fragmented = value.facts.fragmentedMessages;
  const voice = value.facts.excessiveVoiceNote;
  const coordination = value.facts.unacknowledgedCoordination;
  if (
    typeof value.respondent !== "string" ||
    typeof value.statement !== "string" ||
    !isRelationship(value.relationship) ||
    !isOffenceOrEmpty(value.offence) ||
    !isImpactOrEmpty(value.impact) ||
    !isMitigationOrEmpty(value.mitigation) ||
    !isRecord(fragmented) ||
    !isRecord(voice) ||
    !isRecord(coordination) ||
    !strings(fragmented, ["messageCount", "ideaCount", "burstMinutes"]) ||
    !strings(voice, ["durationMinutes", "ideaCount"]) ||
    !strings(coordination, ["responseHours", "followUpCount"])
  )
    return null;
  return value as unknown as DigitalConductDraft;
}

function invalidFiling(): DigitalConductValidationResult {
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
function isOffence(value: unknown): value is DigitalConductOffenceCode {
  return (
    typeof value === "string" &&
    DIGITAL_CONDUCT_OFFENCE_CODES.some((code) => code === value)
  );
}
function isOffenceOrEmpty(
  value: unknown,
): value is DigitalConductOffenceCode | "" {
  return value === "" || isOffence(value);
}
function isImpact(value: unknown): value is DigitalConductImpactCode {
  return (
    typeof value === "string" &&
    DIGITAL_CONDUCT_IMPACT_CODES.some((code) => code === value)
  );
}
function isImpactOrEmpty(
  value: unknown,
): value is DigitalConductImpactCode | "" {
  return value === "" || isImpact(value);
}
function isMitigation(value: unknown): value is DigitalConductMitigationCode {
  return (
    typeof value === "string" &&
    DIGITAL_CONDUCT_MITIGATION_CODES.some((code) => code === value)
  );
}
function isMitigationOrEmpty(
  value: unknown,
): value is DigitalConductMitigationCode | "" {
  return value === "" || isMitigation(value);
}
