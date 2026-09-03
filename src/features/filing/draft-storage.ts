import {
  CHRONOLOGY_OFFENCE_CODES,
  IMPACT_CODES,
  MITIGATION_CODES,
  RELATIONSHIP_CODES,
  containsUnnecessaryIdentifier,
  countCharacters,
  type ChronologyDraft,
  validateWitnessStatement,
} from "@/domain/filing/chronology";
import {
  DIGITAL_CONDUCT_IMPACT_CODES,
  DIGITAL_CONDUCT_MITIGATION_CODES,
  DIGITAL_CONDUCT_OFFENCE_CODES,
  type DigitalConductDraft,
} from "@/domain/filing/digital-conduct";
import {
  DOMESTIC_AFFAIRS_IMPACT_CODES,
  DOMESTIC_AFFAIRS_MITIGATION_CODES,
  DOMESTIC_AFFAIRS_OFFENCE_CODES,
  type DomesticAffairsDraft,
} from "@/domain/filing/domestic-affairs";
import {
  SOCIAL_PLANNING_IMPACT_CODES,
  SOCIAL_PLANNING_MITIGATION_CODES,
  SOCIAL_PLANNING_OFFENCE_CODES,
  type SocialPlanningDraft,
} from "@/domain/filing/social-planning";
import {
  createEmptyFilingDraft,
  type FilingDraft,
} from "@/domain/filing/filing";
import { type ProductLocale } from "@/domain/locale";

export const FILING_DRAFT_STORAGE_KEY = "bpg:filing:en:v4";
export function filingDraftStorageKey(locale: ProductLocale): string {
  return `bpg:filing:${locale}:v4`;
}
export const LEGACY_DOMESTIC_DRAFT_STORAGE_KEY = "bpg:filing:en:v3";
export const LEGACY_DEPARTMENT_DRAFT_STORAGE_KEY = "bpg:filing:en:v2";
export const LEGACY_CHRONOLOGY_DRAFT_STORAGE_KEY =
  "bpg:filing:chronology:en:v1";
export const FILING_DRAFT_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

interface DraftEnvelope {
  version: 4;
  locale: ProductLocale;
  updatedAt: number;
  draft: FilingDraft;
}

export type StoredDraftResult =
  | { status: "empty"; draft: FilingDraft }
  | { status: "restored"; draft: FilingDraft }
  | { status: "expired"; draft: FilingDraft }
  | { status: "invalid"; draft: FilingDraft };

export function serializeDraft(
  draft: FilingDraft,
  now: number,
  locale: ProductLocale = "en",
): string {
  const envelope: DraftEnvelope = {
    version: 4,
    locale,
    updatedAt: now,
    draft: safeDraft(draft),
  };
  return JSON.stringify(envelope);
}

export function parseStoredDraft(
  value: string | null,
  now: number,
  locale: ProductLocale = "en",
): StoredDraftResult {
  if (value === null)
    return { status: "empty", draft: createEmptyFilingDraft() };

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !isRecord(parsed) ||
      (parsed.version !== 1 &&
        parsed.version !== 2 &&
        parsed.version !== 3 &&
        parsed.version !== 4) ||
      parsed.locale !== locale ||
      typeof parsed.updatedAt !== "number" ||
      !Number.isFinite(parsed.updatedAt)
    )
      return { status: "invalid", draft: createEmptyFilingDraft() };
    const draft = normalizeDraft(parsed.draft, parsed.version);
    if (!draft) return { status: "invalid", draft: createEmptyFilingDraft() };
    if (
      parsed.updatedAt > now ||
      now - parsed.updatedAt > FILING_DRAFT_LIFETIME_MS
    ) {
      return { status: "expired", draft: createEmptyFilingDraft() };
    }
    return { status: "restored", draft };
  } catch {
    return { status: "invalid", draft: createEmptyFilingDraft() };
  }
}

function safeDraft(draft: FilingDraft): FilingDraft {
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

function normalizeDraft(
  value: unknown,
  version: 1 | 2 | 3 | 4,
): FilingDraft | null {
  if (version === 1 && isChronologyDraft(value, true)) {
    return { ...value, department: "chronology" };
  }
  if (isChronologyDraft(value, false)) return value;
  if (isDigitalConductDraft(value)) return value;
  if (isDomesticAffairsDraft(value)) return value;
  if (isSocialPlanningDraft(value)) return value;
  return null;
}

function isChronologyDraft(
  value: unknown,
  legacy: true,
): value is Omit<ChronologyDraft, "department">;
function isChronologyDraft(
  value: unknown,
  legacy: false,
): value is ChronologyDraft;
function isChronologyDraft(value: unknown, legacy: boolean): boolean {
  if (!isRecord(value) || !isRecord(value.facts)) return false;
  const premature = value.facts.prematureDeparture;
  const late = value.facts.chronicLateness;
  const estimate = value.facts.optimisticEstimate;
  const statementIssue =
    typeof value.statement === "string" && value.statement.length > 0
      ? validateWitnessStatement(value.statement)
      : null;
  return (
    (legacy
      ? value.department === undefined
      : value.department === "chronology") &&
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

function isDigitalConductDraft(value: unknown): value is DigitalConductDraft {
  if (
    !isRecord(value) ||
    value.department !== "digital_conduct" ||
    !isRecord(value.facts)
  )
    return false;
  const fragmented = value.facts.fragmentedMessages;
  const voice = value.facts.excessiveVoiceNote;
  const coordination = value.facts.unacknowledgedCoordination;
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
      DIGITAL_CONDUCT_OFFENCE_CODES.some((code) => code === value.offence)) &&
    (value.impact === "" ||
      DIGITAL_CONDUCT_IMPACT_CODES.some((code) => code === value.impact)) &&
    (value.mitigation === "" ||
      DIGITAL_CONDUCT_MITIGATION_CODES.some(
        (code) => code === value.mitigation,
      )) &&
    typeof value.statement === "string" &&
    statementIssue !== "statement_too_long" &&
    statementIssue !== "restricted_content" &&
    statementIssue !== "unnecessary_identifier" &&
    isRecord(fragmented) &&
    stringsWithin(
      fragmented,
      ["messageCount", "ideaCount", "burstMinutes"],
      3,
    ) &&
    isRecord(voice) &&
    stringsWithin(voice, ["durationMinutes", "ideaCount"], 3) &&
    isRecord(coordination) &&
    stringsWithin(coordination, ["responseHours", "followUpCount"], 3)
  );
}

function isDomesticAffairsDraft(value: unknown): value is DomesticAffairsDraft {
  if (
    !isRecord(value) ||
    value.department !== "domestic_affairs" ||
    !isRecord(value.facts)
  )
    return false;
  const remainder = value.facts.tokenRemainder;
  const object = value.facts.misplacedObject;
  const packaging = value.facts.emptyPackaging;
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
      DOMESTIC_AFFAIRS_OFFENCE_CODES.some((code) => code === value.offence)) &&
    (value.impact === "" ||
      DOMESTIC_AFFAIRS_IMPACT_CODES.some((code) => code === value.impact)) &&
    (value.mitigation === "" ||
      DOMESTIC_AFFAIRS_MITIGATION_CODES.some(
        (code) => code === value.mitigation,
      )) &&
    typeof value.statement === "string" &&
    statementIssue !== "statement_too_long" &&
    statementIssue !== "restricted_content" &&
    statementIssue !== "unnecessary_identifier" &&
    isRecord(remainder) &&
    stringsWithin(remainder, ["remainingServings", "capacityServings"], 3) &&
    isRecord(object) &&
    stringsWithin(
      object,
      ["itemCount", "distanceSteps", "correctionSeconds"],
      3,
    ) &&
    isRecord(packaging) &&
    stringsWithin(
      packaging,
      ["emptyPackageCount", "recurrencesInThirtyDays"],
      3,
    )
  );
}

function isSocialPlanningDraft(value: unknown): value is SocialPlanningDraft {
  if (
    !isRecord(value) ||
    value.department !== "social_planning" ||
    !isRecord(value.facts)
  )
    return false;
  const veto = value.facts.optionVetoCycle;
  const drift = value.facts.decisionDrift;
  const revision = value.facts.confirmedPlanRevision;
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
      SOCIAL_PLANNING_OFFENCE_CODES.some((code) => code === value.offence)) &&
    (value.impact === "" ||
      SOCIAL_PLANNING_IMPACT_CODES.some((code) => code === value.impact)) &&
    (value.mitigation === "" ||
      SOCIAL_PLANNING_MITIGATION_CODES.some(
        (code) => code === value.mitigation,
      )) &&
    typeof value.statement === "string" &&
    statementIssue !== "statement_too_long" &&
    statementIssue !== "restricted_content" &&
    statementIssue !== "unnecessary_identifier" &&
    isRecord(veto) &&
    stringsWithin(
      veto,
      ["proposedOptionCount", "rejectedOptionCount", "alternativeOptionCount"],
      3,
    ) &&
    isRecord(drift) &&
    stringsWithin(
      drift,
      ["decisionRoundCount", "elapsedHours", "participantCount"],
      3,
    ) &&
    isRecord(revision) &&
    stringsWithin(
      revision,
      ["revisionCount", "participantCount", "noticeHours"],
      3,
    )
  );
}

function stringsWithin(
  value: Record<string, unknown>,
  keys: readonly string[],
  maximum: number,
): boolean {
  return keys.every(
    (key) => typeof value[key] === "string" && value[key].length <= maximum,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
