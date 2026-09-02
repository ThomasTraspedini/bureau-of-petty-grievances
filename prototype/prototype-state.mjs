export const STEP_ORDER = [
  "respondent",
  "relationship",
  "department",
  "offence",
  "timing",
  "impact",
  "mitigation",
  "statement",
];

export const CHRONOLOGY_OFFENCES = [
  "prematureDeparture",
  "chronicLateness",
  "optimisticEstimate",
];

export const DEFAULT_FILING = Object.freeze({
  respondent: "Marco",
  relationship: "friend",
  department: "chronology",
  offence: "prematureDeparture",
  promisedTime: "19:30",
  actualDelay: "24",
  impact: "tableHeld",
  mitigation: "bringsDessert",
  statement:
    "He wrote ‘leaving now’ and was still in the shower twenty minutes later.",
});

export function createFiling(overrides = {}) {
  return { ...DEFAULT_FILING, ...overrides };
}

export function parseStoredFiling(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createFiling();

  const allowed = {
    relationship: new Set(["friend", "partner", "roommate", "colleague", "sibling"]),
    department: new Set(["chronology"]),
    offence: new Set(CHRONOLOGY_OFFENCES),
    impact: new Set(["tableHeld", "repeatedUpdates", "plansCompressed", "noMaterial"]),
    mitigation: new Set(["bringsDessert", "apologizes", "helpsOthers", "warns"]),
  };
  const parsed = createFiling();

  if (typeof value.respondent === "string" && value.respondent.length <= 32) parsed.respondent = value.respondent;
  if (typeof value.promisedTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.promisedTime)) parsed.promisedTime = value.promisedTime;
  if (typeof value.actualDelay === "string" && Number(value.actualDelay) >= 1 && Number(value.actualDelay) <= 180) parsed.actualDelay = value.actualDelay;
  if (typeof value.statement === "string" && value.statement.length <= 160) parsed.statement = value.statement;

  for (const [field, choices] of Object.entries(allowed)) {
    if (choices.has(value[field])) parsed[field] = value[field];
  }

  return parsed;
}

export function getNextStep(step) {
  const index = STEP_ORDER.indexOf(step);
  return index >= 0 && index < STEP_ORDER.length - 1
    ? STEP_ORDER[index + 1]
    : "review";
}

export function getPreviousStep(step) {
  const index = STEP_ORDER.indexOf(step);
  return index > 0 ? STEP_ORDER[index - 1] : "access";
}

export function validateStep(step, filing) {
  if (step === "respondent") {
    const value = filing.respondent.trim();
    if (value.length === 0) return "required";
    if (value.length > 32) return "tooLong";
  }

  if (step === "timing") {
    const delay = Number(filing.actualDelay);
    if (!Number.isFinite(delay) || delay < 1 || delay > 180) return "invalidDelay";
  }

  if (step === "mitigation" && !filing.mitigation) return "mitigationRequired";

  if (step === "statement") {
    const value = filing.statement.trim();
    if (value.length === 0) return "required";
    if (value.length > 160) return "statementTooLong";
    if (containsRestrictedContent(value)) return "restrictedContent";
  }

  return null;
}

export function containsRestrictedContent(value) {
  const normalized = value.toLocaleLowerCase("en");
  const restrictedTerms = ["assault", "abuse", "threat", "minor", "diagnosis"];
  return restrictedTerms.some((term) => normalized.includes(term));
}

export function buildDetermination(filing) {
  const delay = Number(filing.actualDelay);
  const severity = delay >= 30 ? "material" : delay >= 15 ? "established" : "limited";

  return {
    recordId: "BPG-CH-0427",
    department: filing.department,
    offence: filing.offence,
    delayMinutes: delay,
    severity,
    acceptedMitigation: filing.mitigation,
    outcome: "upheldWithCircumstances",
    remedy: "departureLanguage",
  };
}

export function updateConsultation(counts, position) {
  if (!(position in counts)) return counts;
  return { ...counts, [position]: counts[position] + 1 };
}
