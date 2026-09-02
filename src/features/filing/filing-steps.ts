export const FILING_STEP_CODES = [
  "respondent",
  "relationship",
  "classification",
  "chronology",
  "impact",
  "mitigation",
  "statement",
  "review",
] as const;

export type FilingStepCode = (typeof FILING_STEP_CODES)[number];

export const QUESTION_STEP_CODES = FILING_STEP_CODES.slice(0, 7);

export function isFilingStep(value: string): value is FilingStepCode {
  return FILING_STEP_CODES.some((step) => step === value);
}

export function previousFilingStep(
  step: FilingStepCode,
): FilingStepCode | null {
  const index = FILING_STEP_CODES.indexOf(step);
  return index > 0 ? (FILING_STEP_CODES[index - 1] ?? null) : null;
}

export function nextFilingStep(step: FilingStepCode): FilingStepCode | null {
  const index = FILING_STEP_CODES.indexOf(step);
  return index >= 0 && index < FILING_STEP_CODES.length - 1
    ? (FILING_STEP_CODES[index + 1] ?? null)
    : null;
}
