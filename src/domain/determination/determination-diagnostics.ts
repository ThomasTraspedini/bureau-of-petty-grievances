import type { DeterminationLanguage } from "./determination-language";

/** Ephemeral evaluator context. This is never part of a public determination. */
export interface DeterminationLanguageDiagnostics {
  source: "personalized" | "standard";
  standardLanguage: DeterminationLanguage;
}
