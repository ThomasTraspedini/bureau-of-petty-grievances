import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import {
  determinationPresentationVariant,
  DETERMINATION_EXPERIENCE_VERSION,
  DETERMINATION_TRANSIENT_LIFETIME_MS,
  isDeterminationReference,
  type ChronologyDeterminationSnapshot,
  type IssuedChronologyDetermination,
} from "@/domain/determination/determination-experience";
import { createChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { validateEnglishChronologyLanguage } from "@/domain/determination/locales/en";
import {
  type ChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";

export const DETERMINATION_SESSION_KEY = "bpg:determination:chronology:en:v1";
export const DETERMINATION_SESSION_LIFETIME_MS =
  DETERMINATION_TRANSIENT_LIFETIME_MS;

interface DeterminationSessionEnvelope {
  version: 1;
  locale: "en";
  createdAt: number;
  draft: ChronologyDraft;
  determination: IssuedChronologyDetermination;
}

export type StoredDeterminationResult =
  | { status: "restored"; snapshot: ChronologyDeterminationSnapshot }
  | { status: "empty" | "expired" | "invalid" };

export function serializeDeterminationSession(
  draft: ChronologyDraft,
  determination: IssuedChronologyDetermination,
  now: number,
): string {
  const envelope: DeterminationSessionEnvelope = {
    version: 1,
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

    const filingResult = validateChronologyDraft(parsed.draft, parsed.locale);
    if (filingResult.status === "invalid") return { status: "invalid" };
    const assessment = assessChronologyFiling(filingResult.filing);
    if (
      JSON.stringify(parsed.determination.assessment) !==
      JSON.stringify(assessment)
    ) {
      return { status: "invalid" };
    }

    const command = createChronologyDeterminationLanguageCommand(
      filingResult.filing,
      assessment,
    );
    if (command.status === "invalid") return { status: "invalid" };
    const language = validateEnglishChronologyLanguage(
      parsed.determination.language,
      command.command,
    );
    if (language.status === "invalid") return { status: "invalid" };

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

    return {
      status: "restored",
      snapshot: {
        experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
        locale: "en",
        reference: parsed.determination.reference,
        issuedAt: parsed.determination.issuedAt,
        assessment,
        language: language.language,
        filing: filingResult.filing,
        presentationVariant: determinationPresentationVariant(
          parsed.determination.reference,
          assessment.presentation.visualSeed,
        ),
      },
    };
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
    value.version !== 1 ||
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
