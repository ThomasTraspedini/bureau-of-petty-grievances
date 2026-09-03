export const FILING_STEP_CODES = [
  "respondent",
  "relationship",
  "department",
  "classification",
  "chronology",
  "communications",
  "domestic_evidence",
  "impact",
  "mitigation",
  "statement",
  "review",
] as const;

export type FilingStepCode = (typeof FILING_STEP_CODES)[number];

export const QUESTION_STEP_CODES = FILING_STEP_CODES.filter(
  (step) => step !== "review",
);
export const FILING_QUESTION_COUNT = 8;

export function isFilingStep(value: string): value is FilingStepCode {
  return FILING_STEP_CODES.some((step) => step === value);
}

export function previousFilingStep(
  step: FilingStepCode,
  department:
    "chronology" | "digital_conduct" | "domestic_affairs" = "chronology",
): FilingStepCode | null {
  const sequence = sequenceFor(department);
  const index = sequence.indexOf(step);
  return index > 0 ? (sequence[index - 1] ?? null) : null;
}

export function nextFilingStep(
  step: FilingStepCode,
  department:
    "chronology" | "digital_conduct" | "domestic_affairs" = "chronology",
): FilingStepCode | null {
  const sequence = sequenceFor(department);
  const index = sequence.indexOf(step);
  return index >= 0 && index < sequence.length - 1
    ? (sequence[index + 1] ?? null)
    : null;
}

export function filingStepIndex(
  step: FilingStepCode,
  department: "chronology" | "digital_conduct" | "domestic_affairs",
): number {
  return sequenceFor(department).indexOf(step) + 1;
}

function sequenceFor(
  department: "chronology" | "digital_conduct" | "domestic_affairs",
): readonly FilingStepCode[] {
  return [
    "respondent",
    "relationship",
    "department",
    "classification",
    department === "chronology"
      ? "chronology"
      : department === "digital_conduct"
        ? "communications"
        : "domestic_evidence",
    "impact",
    "mitigation",
    "statement",
    "review",
  ];
}
