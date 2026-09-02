import type { ChronologyAssessment } from "@/domain/determination/chronology-assessment";
import type { DeterminationLanguage } from "@/domain/determination/determination-language";
import type { ChronologyFiling } from "@/domain/filing/chronology";

export const DETERMINATION_EXPERIENCE_VERSION = 1 as const;

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

export function createDeterminationReference(
  issuedAt: Date,
  randomPart: string,
): string {
  const normalizedPart = randomPart
    .normalize("NFKC")
    .replace(/[^A-Z0-9]/gu, "")
    .slice(0, 6);
  if (normalizedPart.length !== 6) {
    throw new Error("A six-character procedural reference part is required.");
  }
  return `CHR · ${String(issuedAt.getUTCFullYear())} · ${normalizedPart}`;
}

export function isDeterminationReference(value: unknown): value is string {
  return (
    typeof value === "string" && /^CHR · \d{4} · [A-Z0-9]{6}$/u.test(value)
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
