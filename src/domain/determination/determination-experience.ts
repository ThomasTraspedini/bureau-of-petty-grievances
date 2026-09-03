import {
  assessChronologyFiling,
  type ChronologyAssessment,
} from "@/domain/determination/chronology-assessment";
import {
  createChronologyDeterminationLanguageCommand,
  type DeterminationLanguage,
} from "@/domain/determination/determination-language";
import { validateEnglishChronologyLanguage } from "@/domain/determination/locales/en";
import {
  type ChronologyFiling,
  validateChronologyFiling,
} from "@/domain/filing/chronology";
import {
  assessDigitalConductFiling,
  type DigitalConductAssessment,
} from "@/domain/determination/digital-conduct-assessment";
import { createDigitalConductDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { validateEnglishDigitalConductLanguage } from "@/domain/determination/locales/en-digital-conduct";
import {
  type DigitalConductFiling,
  validateDigitalConductFiling,
} from "@/domain/filing/digital-conduct";
import {
  assessDomesticAffairsFiling,
  type DomesticAffairsAssessment,
} from "@/domain/determination/domestic-affairs-assessment";
import { createDomesticAffairsDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { validateEnglishDomesticAffairsLanguage } from "@/domain/determination/locales/en-domestic-affairs";
import {
  type DomesticAffairsFiling,
  validateDomesticAffairsFiling,
} from "@/domain/filing/domestic-affairs";
import {
  assessSocialPlanningFiling,
  type SocialPlanningAssessment,
} from "@/domain/determination/social-planning-assessment";
import { createSocialPlanningDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { validateEnglishSocialPlanningLanguage } from "@/domain/determination/locales/en-social-planning";
import {
  validateItalianChronologyLanguage,
  validateItalianDigitalConductLanguage,
  validateItalianDomesticAffairsLanguage,
  validateItalianSocialPlanningLanguage,
} from "@/domain/determination/locales/it";
import {
  type SocialPlanningFiling,
  validateSocialPlanningFiling,
} from "@/domain/filing/social-planning";

export const DETERMINATION_EXPERIENCE_VERSION = 1 as const;
export const DETERMINATION_TRANSIENT_LIFETIME_MS = 30 * 60 * 1000;

export interface IssuedChronologyDetermination {
  experienceVersion: typeof DETERMINATION_EXPERIENCE_VERSION;
  locale: ChronologyFiling["locale"];
  reference: string;
  issuedAt: string;
  assessment: ChronologyAssessment;
  language: DeterminationLanguage;
}

export interface ChronologyDeterminationSnapshot extends IssuedChronologyDetermination {
  filing: ChronologyFiling;
  presentationVariant: 0 | 1 | 2 | 3;
}

export interface IssuedDigitalConductDetermination {
  experienceVersion: typeof DETERMINATION_EXPERIENCE_VERSION;
  locale: DigitalConductFiling["locale"];
  reference: string;
  issuedAt: string;
  assessment: DigitalConductAssessment;
  language: DeterminationLanguage;
}

export interface DigitalConductDeterminationSnapshot extends IssuedDigitalConductDetermination {
  filing: DigitalConductFiling;
  presentationVariant: 0 | 1 | 2 | 3;
}

export interface IssuedDomesticAffairsDetermination {
  experienceVersion: typeof DETERMINATION_EXPERIENCE_VERSION;
  locale: DomesticAffairsFiling["locale"];
  reference: string;
  issuedAt: string;
  assessment: DomesticAffairsAssessment;
  language: DeterminationLanguage;
}

export interface DomesticAffairsDeterminationSnapshot extends IssuedDomesticAffairsDetermination {
  filing: DomesticAffairsFiling;
  presentationVariant: 0 | 1 | 2 | 3;
}

export interface IssuedSocialPlanningDetermination {
  experienceVersion: typeof DETERMINATION_EXPERIENCE_VERSION;
  locale: SocialPlanningFiling["locale"];
  reference: string;
  issuedAt: string;
  assessment: SocialPlanningAssessment;
  language: DeterminationLanguage;
}

export interface SocialPlanningDeterminationSnapshot extends IssuedSocialPlanningDetermination {
  filing: SocialPlanningFiling;
  presentationVariant: 0 | 1 | 2 | 3;
}

export type IssuedDetermination =
  | IssuedChronologyDetermination
  | IssuedDigitalConductDetermination
  | IssuedDomesticAffairsDetermination
  | IssuedSocialPlanningDetermination;
export type DeterminationSnapshot =
  | ChronologyDeterminationSnapshot
  | DigitalConductDeterminationSnapshot
  | DomesticAffairsDeterminationSnapshot
  | SocialPlanningDeterminationSnapshot;

export function createIssuedDetermination(
  reference: string,
  issuedAt: string,
  assessment:
    | ChronologyAssessment
    | DigitalConductAssessment
    | DomesticAffairsAssessment
    | SocialPlanningAssessment,
  language: DeterminationLanguage,
): IssuedDetermination {
  if (assessment.department === "chronology") {
    return {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: assessment.locale,
      reference,
      issuedAt,
      assessment,
      language,
    };
  }
  if (assessment.department === "digital_conduct") {
    return {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: assessment.locale,
      reference,
      issuedAt,
      assessment,
      language,
    };
  }
  if (assessment.department === "domestic_affairs") {
    return {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: assessment.locale,
      reference,
      issuedAt,
      assessment,
      language,
    };
  }
  return {
    experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
    locale: assessment.locale,
    reference,
    issuedAt,
    assessment,
    language,
  };
}

export type DeterminationSnapshotValidation =
  | { status: "valid"; snapshot: ChronologyDeterminationSnapshot }
  | { status: "invalid" };

export function validateChronologyDeterminationSnapshot(
  value: unknown,
  now: Date,
): DeterminationSnapshotValidation {
  if (
    !isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) ||
    value.experienceVersion !== DETERMINATION_EXPERIENCE_VERSION ||
    (value.locale !== "en" && value.locale !== "it") ||
    !isDeterminationReference(value.reference) ||
    typeof value.issuedAt !== "string"
  ) {
    return { status: "invalid" };
  }

  const filingResult = validateChronologyFiling(value.filing, value.locale);
  if (filingResult.status === "invalid") return { status: "invalid" };
  const assessment = assessChronologyFiling(filingResult.filing);
  if (canonicalJson(value.assessment) !== canonicalJson(assessment)) {
    return { status: "invalid" };
  }

  const command = createChronologyDeterminationLanguageCommand(
    filingResult.filing,
    assessment,
  );
  if (command.status === "invalid") return { status: "invalid" };
  const language =
    command.command.locale === "it"
      ? validateItalianChronologyLanguage(value.language, command.command)
      : validateEnglishChronologyLanguage(value.language, command.command);
  if (language.status === "invalid") return { status: "invalid" };

  const issuedAt = new Date(value.issuedAt);
  if (
    !Number.isFinite(issuedAt.getTime()) ||
    issuedAt.getTime() > now.getTime() + 5 * 60 * 1000 ||
    !value.reference.includes(String(issuedAt.getUTCFullYear()))
  ) {
    return { status: "invalid" };
  }

  const presentationVariant = determinationPresentationVariant(
    value.reference,
    assessment.presentation.visualSeed,
  );
  if (value.presentationVariant !== presentationVariant) {
    return { status: "invalid" };
  }

  return {
    status: "valid",
    snapshot: {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: filingResult.filing.locale,
      reference: value.reference,
      issuedAt: value.issuedAt,
      assessment,
      language: language.language,
      filing: filingResult.filing,
      presentationVariant,
    },
  };
}

export function validateDigitalConductDeterminationSnapshot(
  value: unknown,
  now: Date,
):
  | { status: "valid"; snapshot: DigitalConductDeterminationSnapshot }
  | { status: "invalid" } {
  if (
    !isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) ||
    value.experienceVersion !== DETERMINATION_EXPERIENCE_VERSION ||
    (value.locale !== "en" && value.locale !== "it") ||
    !isDeterminationReference(value.reference) ||
    typeof value.issuedAt !== "string"
  )
    return { status: "invalid" };
  const filingResult = validateDigitalConductFiling(value.filing, value.locale);
  if (filingResult.status === "invalid") return { status: "invalid" };
  const assessment = assessDigitalConductFiling(filingResult.filing);
  if (canonicalJson(value.assessment) !== canonicalJson(assessment))
    return { status: "invalid" };
  const command = createDigitalConductDeterminationLanguageCommand(
    filingResult.filing,
    assessment,
  );
  if (command.status === "invalid") return { status: "invalid" };
  const language =
    command.command.locale === "it"
      ? validateItalianDigitalConductLanguage(value.language, command.command)
      : validateEnglishDigitalConductLanguage(value.language, command.command);
  if (language.status === "invalid") return { status: "invalid" };
  const issuedAt = new Date(value.issuedAt);
  if (
    !Number.isFinite(issuedAt.getTime()) ||
    issuedAt.getTime() > now.getTime() + 5 * 60 * 1000 ||
    !value.reference.includes(String(issuedAt.getUTCFullYear()))
  )
    return { status: "invalid" };
  const presentationVariant = determinationPresentationVariant(
    value.reference,
    assessment.presentation.visualSeed,
  );
  if (value.presentationVariant !== presentationVariant)
    return { status: "invalid" };
  return {
    status: "valid",
    snapshot: {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: filingResult.filing.locale,
      reference: value.reference,
      issuedAt: value.issuedAt,
      assessment,
      language: language.language,
      filing: filingResult.filing,
      presentationVariant,
    },
  };
}

export function validateDomesticAffairsDeterminationSnapshot(
  value: unknown,
  now: Date,
):
  | { status: "valid"; snapshot: DomesticAffairsDeterminationSnapshot }
  | { status: "invalid" } {
  if (
    !isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) ||
    value.experienceVersion !== DETERMINATION_EXPERIENCE_VERSION ||
    (value.locale !== "en" && value.locale !== "it") ||
    !isDeterminationReference(value.reference) ||
    typeof value.issuedAt !== "string"
  )
    return { status: "invalid" };
  const filingResult = validateDomesticAffairsFiling(
    value.filing,
    value.locale,
  );
  if (filingResult.status === "invalid") return { status: "invalid" };
  const assessment = assessDomesticAffairsFiling(filingResult.filing);
  if (canonicalJson(value.assessment) !== canonicalJson(assessment))
    return { status: "invalid" };
  const command = createDomesticAffairsDeterminationLanguageCommand(
    filingResult.filing,
    assessment,
  );
  if (command.status === "invalid") return { status: "invalid" };
  const language =
    command.command.locale === "it"
      ? validateItalianDomesticAffairsLanguage(value.language, command.command)
      : validateEnglishDomesticAffairsLanguage(value.language, command.command);
  if (language.status === "invalid") return { status: "invalid" };
  const issuedAt = new Date(value.issuedAt);
  if (
    !Number.isFinite(issuedAt.getTime()) ||
    issuedAt.getTime() > now.getTime() + 5 * 60 * 1000 ||
    !value.reference.includes(String(issuedAt.getUTCFullYear()))
  )
    return { status: "invalid" };
  const presentationVariant = determinationPresentationVariant(
    value.reference,
    assessment.presentation.visualSeed,
  );
  if (value.presentationVariant !== presentationVariant)
    return { status: "invalid" };
  return {
    status: "valid",
    snapshot: {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: filingResult.filing.locale,
      reference: value.reference,
      issuedAt: value.issuedAt,
      assessment,
      language: language.language,
      filing: filingResult.filing,
      presentationVariant,
    },
  };
}

export function validateSocialPlanningDeterminationSnapshot(
  value: unknown,
  now: Date,
):
  | { status: "valid"; snapshot: SocialPlanningDeterminationSnapshot }
  | { status: "invalid" } {
  if (
    !isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) ||
    value.experienceVersion !== DETERMINATION_EXPERIENCE_VERSION ||
    (value.locale !== "en" && value.locale !== "it") ||
    !isDeterminationReference(value.reference) ||
    typeof value.issuedAt !== "string"
  )
    return { status: "invalid" };
  const filingResult = validateSocialPlanningFiling(value.filing, value.locale);
  if (filingResult.status === "invalid") return { status: "invalid" };
  const assessment = assessSocialPlanningFiling(filingResult.filing);
  if (canonicalJson(value.assessment) !== canonicalJson(assessment))
    return { status: "invalid" };
  const command = createSocialPlanningDeterminationLanguageCommand(
    filingResult.filing,
    assessment,
  );
  if (command.status === "invalid") return { status: "invalid" };
  const language =
    command.command.locale === "it"
      ? validateItalianSocialPlanningLanguage(value.language, command.command)
      : validateEnglishSocialPlanningLanguage(value.language, command.command);
  if (language.status === "invalid") return { status: "invalid" };
  const issuedAt = new Date(value.issuedAt);
  if (
    !Number.isFinite(issuedAt.getTime()) ||
    issuedAt.getTime() > now.getTime() + 5 * 60 * 1000 ||
    !value.reference.includes(String(issuedAt.getUTCFullYear()))
  )
    return { status: "invalid" };
  const presentationVariant = determinationPresentationVariant(
    value.reference,
    assessment.presentation.visualSeed,
  );
  if (value.presentationVariant !== presentationVariant)
    return { status: "invalid" };
  return {
    status: "valid",
    snapshot: {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: filingResult.filing.locale,
      reference: value.reference,
      issuedAt: value.issuedAt,
      assessment,
      language: language.language,
      filing: filingResult.filing,
      presentationVariant,
    },
  };
}

export function validateDeterminationSnapshot(
  value: unknown,
  now: Date,
):
  { status: "valid"; snapshot: DeterminationSnapshot } | { status: "invalid" } {
  if (
    isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) &&
    isRecord(value.filing) &&
    value.filing.department === "digital_conduct"
  ) {
    return validateDigitalConductDeterminationSnapshot(value, now);
  }
  if (
    isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) &&
    isRecord(value.filing) &&
    value.filing.department === "domestic_affairs"
  ) {
    return validateDomesticAffairsDeterminationSnapshot(value, now);
  }
  if (
    isExactRecord(value, [
      "experienceVersion",
      "locale",
      "reference",
      "issuedAt",
      "assessment",
      "language",
      "filing",
      "presentationVariant",
    ]) &&
    isRecord(value.filing) &&
    value.filing.department === "social_planning"
  ) {
    return validateSocialPlanningDeterminationSnapshot(value, now);
  }
  return validateChronologyDeterminationSnapshot(value, now);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      record[key] = item;
    }
    return `{${Object.entries(record)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  if (value === undefined) return "null";
  return JSON.stringify(value);
}

export function createDeterminationReference(
  issuedAt: Date,
  randomPart: string,
  department:
    | "chronology"
    | "digital_conduct"
    | "domestic_affairs"
    | "social_planning" = "chronology",
): string {
  const normalizedPart = randomPart
    .normalize("NFKC")
    .replace(/[^A-Z0-9]/gu, "")
    .slice(0, 6);
  if (normalizedPart.length !== 6) {
    throw new Error("A six-character procedural reference part is required.");
  }
  const prefix =
    department === "chronology"
      ? "CHR"
      : department === "digital_conduct"
        ? "DIG"
        : department === "domestic_affairs"
          ? "DOM"
          : "SOC";
  return `${prefix} · ${String(issuedAt.getUTCFullYear())} · ${normalizedPart}`;
}

export function isDeterminationReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:CHR|DIG|DOM|SOC) · \d{4} · [A-Z0-9]{6}$/u.test(value)
  );
}

export function determinationPresentationVariant(
  reference: string,
  assessmentVisualSeed: string,
): 0 | 1 | 2 | 3 {
  let hash = 0x811c9dc5;
  for (const character of `${reference}|${assessmentVisualSeed}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  switch (hash % 4) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 3;
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
