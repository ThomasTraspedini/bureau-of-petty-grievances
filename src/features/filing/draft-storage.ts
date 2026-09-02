import {
  CHRONOLOGY_OFFENCE_CODES,
  IMPACT_CODES,
  MITIGATION_CODES,
  RELATIONSHIP_CODES,
  containsUnnecessaryIdentifier,
  countCharacters,
  createEmptyChronologyDraft,
  type ChronologyDraft,
  validateWitnessStatement,
} from "@/domain/filing/chronology";

export const FILING_DRAFT_STORAGE_KEY = "bpg:filing:chronology:en:v1";
export const FILING_DRAFT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

interface DraftEnvelope {
  version: 1;
  locale: "en";
  updatedAt: number;
  draft: ChronologyDraft;
}

export type StoredDraftResult =
  | { status: "empty"; draft: ChronologyDraft }
  | { status: "restored"; draft: ChronologyDraft }
  | { status: "expired"; draft: ChronologyDraft }
  | { status: "invalid"; draft: ChronologyDraft };

export function serializeDraft(draft: ChronologyDraft, now: number): string {
  const envelope: DraftEnvelope = {
    version: 1,
    locale: "en",
    updatedAt: now,
    draft: safeDraft(draft),
  };
  return JSON.stringify(envelope);
}

export function parseStoredDraft(
  value: string | null,
  now: number,
): StoredDraftResult {
  if (value === null)
    return { status: "empty", draft: createEmptyChronologyDraft() };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isEnvelope(parsed)) {
      return { status: "invalid", draft: createEmptyChronologyDraft() };
    }
    if (
      parsed.updatedAt > now ||
      now - parsed.updatedAt > FILING_DRAFT_LIFETIME_MS
    ) {
      return { status: "expired", draft: createEmptyChronologyDraft() };
    }
    return { status: "restored", draft: parsed.draft };
  } catch {
    return { status: "invalid", draft: createEmptyChronologyDraft() };
  }
}

function safeDraft(draft: ChronologyDraft): ChronologyDraft {
  const statementError = validateWitnessStatement(draft.statement);
  return {
    ...draft,
    statement:
      statementError === "restricted_content" ||
      statementError === "unnecessary_identifier"
        ? ""
        : draft.statement,
  };
}

function isEnvelope(value: unknown): value is DraftEnvelope {
  if (!isRecord(value) || value.version !== 1 || value.locale !== "en")
    return false;
  if (typeof value.updatedAt !== "number" || !Number.isFinite(value.updatedAt))
    return false;
  return isDraft(value.draft);
}

function isDraft(value: unknown): value is ChronologyDraft {
  if (!isRecord(value) || !isRecord(value.facts)) return false;
  const premature = value.facts.prematureDeparture;
  const late = value.facts.chronicLateness;
  const estimate = value.facts.optimisticEstimate;
  const statementIssue =
    typeof value.statement === "string" && value.statement.length > 0
      ? validateWitnessStatement(value.statement)
      : null;
  return (
    typeof value.respondent === "string" &&
    countCharacters(value.respondent) <= 32 &&
    !containsUnnecessaryIdentifier(value.respondent) &&
    (value.relationship === "" ||
      RELATIONSHIP_CODES.some((code) => code === value.relationship)) &&
    (value.offence === "" ||
      CHRONOLOGY_OFFENCE_CODES.some((code) => code === value.offence)) &&
    (value.impact === "" ||
      IMPACT_CODES.some((code) => code === value.impact)) &&
    (value.mitigation === "" ||
      MITIGATION_CODES.some((code) => code === value.mitigation)) &&
    typeof value.statement === "string" &&
    statementIssue !== "statement_too_long" &&
    statementIssue !== "restricted_content" &&
    statementIssue !== "unnecessary_identifier" &&
    isRecord(premature) &&
    typeof premature.declaredTime === "string" &&
    premature.declaredTime.length <= 5 &&
    typeof premature.delayMinutes === "string" &&
    premature.delayMinutes.length <= 3 &&
    isRecord(late) &&
    typeof late.agreedTime === "string" &&
    late.agreedTime.length <= 5 &&
    typeof late.delayMinutes === "string" &&
    late.delayMinutes.length <= 3 &&
    isRecord(estimate) &&
    typeof estimate.estimatedMinutes === "string" &&
    estimate.estimatedMinutes.length <= 3 &&
    typeof estimate.actualMinutes === "string" &&
    estimate.actualMinutes.length <= 3
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
