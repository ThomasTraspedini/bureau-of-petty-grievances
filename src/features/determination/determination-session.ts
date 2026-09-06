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
import { isProductLocale, type ProductLocale } from "@/domain/locale";
import type { DeterminationLanguageDiagnostics } from "@/domain/determination/determination-diagnostics";

export const DETERMINATION_SESSION_KEY = "bpg:determination:en:v5";
export function determinationSessionKey(locale: ProductLocale): string {
  return `bpg:determination:${locale}:v5`;
}
export function legacyDeterminationSessionKeyV4(locale: ProductLocale): string {
  return `bpg:determination:${locale}:v4`;
}
export const LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY =
  "bpg:determination:en:v3";
export const LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY =
  "bpg:determination:en:v2";
export const LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY =
  "bpg:determination:chronology:en:v1";
export const DETERMINATION_SESSION_LIFETIME_MS =
  DETERMINATION_TRANSIENT_LIFETIME_MS;

interface DeterminationSessionEnvelope {
  version: 5;
  locale: ProductLocale;
  createdAt: number;
  draft: FilingDraft;
  determination: IssuedDetermination;
  diagnostics: DeterminationLanguageDiagnostics | null;
}

interface LegacyDeterminationSessionEnvelope {
  version: 1 | 2 | 3 | 4;
  locale: ProductLocale;
  createdAt: number;
  draft: FilingDraft;
  determination: IssuedDetermination;
}

export type StoredDeterminationResult =
  | {
      status: "restored";
      snapshot: DeterminationSnapshot;
      diagnostics: DeterminationLanguageDiagnostics | null;
    }
  | { status: "empty" | "expired" | "invalid" };

export function serializeDeterminationSession(
  draft: FilingDraft,
  determination: IssuedDetermination,
  now: number,
  diagnostics: DeterminationLanguageDiagnostics | null = null,
): string {
  const envelope: DeterminationSessionEnvelope = {
    version: 5,
    locale: determination.locale,
    createdAt: now,
    draft,
    determination,
    diagnostics,
  };
  return JSON.stringify(envelope);
}

export function parseDeterminationSession(
  value: string | null,
  now: number,
  expectedLocale: ProductLocale = "en",
): StoredDeterminationResult {
  if (value === null) return { status: "empty" };

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isSessionEnvelope(parsed) || parsed.locale !== expectedLocale)
      return { status: "invalid" };
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
        locale: parsed.locale,
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
    const diagnostics = validateDiagnostics(
      parsed.version === 5 ? parsed.diagnostics : null,
      validated.status === "valid" ? validated.snapshot : null,
      now,
    );
    return validated.status === "valid" && diagnostics !== "invalid"
      ? { status: "restored", snapshot: validated.snapshot, diagnostics }
      : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

function isSessionEnvelope(
  value: unknown,
): value is DeterminationSessionEnvelope | LegacyDeterminationSessionEnvelope {
  const version = isRecord(value) ? value.version : undefined;
  const keys =
    version === 5
      ? [
          "version",
          "locale",
          "createdAt",
          "draft",
          "determination",
          "diagnostics",
        ]
      : ["version", "locale", "createdAt", "draft", "determination"];
  if (
    !isExactRecord(value, keys) ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4 &&
      value.version !== 5) ||
    !isProductLocale(value.locale) ||
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
    isProductLocale(determination.locale) &&
    determination.locale === value.locale &&
    isDeterminationReference(determination.reference) &&
    typeof determination.issuedAt === "string" &&
    (value.version !== 5 || isDiagnosticsShape(value.diagnostics))
  );
}

function validateDiagnostics(
  value: DeterminationLanguageDiagnostics | null,
  snapshot: DeterminationSnapshot | null,
  now: number,
): DeterminationLanguageDiagnostics | null | "invalid" {
  if (value === null) return null;
  if (snapshot === null || !isDiagnosticsShape(value)) return "invalid";
  const validated = validateDeterminationSnapshot(
    { ...snapshot, language: value.standardLanguage },
    new Date(now),
  );
  return validated.status === "valid" ? value : "invalid";
}

function isDiagnosticsShape(
  value: unknown,
): value is DeterminationLanguageDiagnostics | null {
  return (
    value === null ||
    (isExactRecord(value, ["source", "standardLanguage"]) &&
      (value.source === "personalized" || value.source === "standard"))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
