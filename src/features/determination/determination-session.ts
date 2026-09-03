import {
  determinationPresentationVariant,
  DETERMINATION_EXPERIENCE_VERSION,
  DETERMINATION_TRANSIENT_LIFETIME_MS,
  isDeterminationReference,
  type DeterminationSnapshot,
  type IssuedDetermination,
  validateDeterminationSnapshot,
} from "@/domain/determination/determination-experience";
import { type FilingDraft, validateFilingDraft } from "@/domain/filing/filing";
import { assessFiling } from "@/domain/determination/assessment";

export const DETERMINATION_SESSION_KEY = "bpg:determination:en:v2";
export const LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY =
  "bpg:determination:chronology:en:v1";
export const DETERMINATION_SESSION_LIFETIME_MS =
  DETERMINATION_TRANSIENT_LIFETIME_MS;

interface DeterminationSessionEnvelope {
  version: 1 | 2;
  locale: "en";
  createdAt: number;
  draft: FilingDraft;
  determination: IssuedDetermination;
}

export type StoredDeterminationResult =
  | { status: "restored"; snapshot: DeterminationSnapshot }
  | { status: "empty" | "expired" | "invalid" };

export function serializeDeterminationSession(
  draft: FilingDraft,
  determination: IssuedDetermination,
  now: number,
): string {
  const envelope: DeterminationSessionEnvelope = {
    version: 2,
    locale: "en",
    createdAt: now,
    draft,
    determination,
  };
  return JSON.stringify(envelope);
}

export function parseDeterminationSession(
  value: string | null,
  now: number,
): StoredDeterminationResult {
  if (value === null) return { status: "empty" };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isSessionEnvelope(parsed)) return { status: "invalid" };
    if (
      parsed.createdAt > now ||
      now - parsed.createdAt > DETERMINATION_SESSION_LIFETIME_MS
    ) {
      return { status: "expired" };
    }

    const filingResult = validateFilingDraft(parsed.draft, parsed.locale);
    if (filingResult.status === "invalid") return { status: "invalid" };
    const assessment = assessFiling(filingResult.filing);
    if (
      JSON.stringify(parsed.determination.assessment) !==
      JSON.stringify(assessment)
    ) {
      return { status: "invalid" };
    }

    const issuedAt = new Date(parsed.determination.issuedAt);
    if (
      !Number.isFinite(issuedAt.getTime()) ||
      issuedAt.getTime() > now + 5 * 60 * 1000 ||
      !parsed.determination.reference.includes(
        String(issuedAt.getUTCFullYear()),
      )
    ) {
      return { status: "invalid" };
    }

    const validated = validateDeterminationSnapshot(
      {
        experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
        locale: "en",
        reference: parsed.determination.reference,
        issuedAt: parsed.determination.issuedAt,
        assessment,
        language: parsed.determination.language,
        filing: filingResult.filing,
        presentationVariant: determinationPresentationVariant(
          parsed.determination.reference,
          assessment.presentation.visualSeed,
        ),
      },
      new Date(now),
    );
    return validated.status === "valid"
      ? { status: "restored", snapshot: validated.snapshot }
      : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

function isSessionEnvelope(
  value: unknown,
): value is DeterminationSessionEnvelope {
  if (
    !isExactRecord(value, [
      "version",
      "locale",
      "createdAt",
      "draft",
      "determination",
    ]) ||
    (value.version !== 1 && value.version !== 2) ||
    value.locale !== "en" ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    !isExactRecord(value.determination, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
    ])
  ) {
    return false;
  }

  const determination = value.determination;
  return (
    determination.experienceVersion === DETERMINATION_EXPERIENCE_VERSION &&
    determination.locale === "en" &&
    isDeterminationReference(determination.reference) &&
    typeof determination.issuedAt === "string"
  );
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
