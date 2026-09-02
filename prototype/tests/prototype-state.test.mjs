import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_FILING,
  STEP_ORDER,
  buildDetermination,
  containsRestrictedContent,
  createFiling,
  getNextStep,
  getPreviousStep,
  parseStoredFiling,
  updateConsultation,
  validateStep,
} from "../prototype-state.mjs";

test("the representative journey has a stable, reversible step order", () => {
  for (let index = 0; index < STEP_ORDER.length - 1; index += 1) {
    const current = STEP_ORDER[index];
    const next = STEP_ORDER[index + 1];
    assert.equal(getNextStep(current), next);
    assert.equal(getPreviousStep(next), current);
  }
  assert.equal(getPreviousStep(STEP_ORDER[0]), "access");
  assert.equal(getNextStep(STEP_ORDER.at(-1)), "review");
});

test("mitigating context is required before review", () => {
  const filing = createFiling({ mitigation: "" });
  assert.equal(validateStep("mitigation", filing), "mitigationRequired");
  assert.equal(validateStep("mitigation", DEFAULT_FILING), null);
});

test("witness statements remain bounded and reject serious content", () => {
  assert.equal(validateStep("statement", DEFAULT_FILING), null);
  assert.equal(
    validateStep("statement", createFiling({ statement: "This describes abuse." })),
    "restrictedContent",
  );
  assert.equal(
    validateStep("statement", createFiling({ statement: "x".repeat(161) })),
    "statementTooLong",
  );
  assert.equal(containsRestrictedContent("A harmless delay"), false);
});

test("determination parameters follow submitted chronology facts", () => {
  assert.equal(buildDetermination(createFiling({ actualDelay: "8" })).severity, "limited");
  assert.equal(buildDetermination(createFiling({ actualDelay: "24" })).severity, "established");
  assert.equal(buildDetermination(createFiling({ actualDelay: "45" })).severity, "material");
});

test("consultation updates only an approved position without mutating prior counts", () => {
  const counts = { upheld: 18, circumstances: 9, dismissed: 3 };
  const updated = updateConsultation(counts, "circumstances");
  assert.deepEqual(updated, { upheld: 18, circumstances: 10, dismissed: 3 });
  assert.deepEqual(counts, { upheld: 18, circumstances: 9, dismissed: 3 });
  assert.equal(updateConsultation(counts, "other"), counts);
});

test("stored drafts are validated before entering the prototype state", () => {
  const parsed = parseStoredFiling({
    respondent: "x".repeat(40),
    department: "unknown",
    actualDelay: "999",
    mitigation: "apologizes",
  });
  assert.equal(parsed.respondent, DEFAULT_FILING.respondent);
  assert.equal(parsed.department, "chronology");
  assert.equal(parsed.actualDelay, DEFAULT_FILING.actualDelay);
  assert.equal(parsed.mitigation, "apologizes");
  assert.deepEqual(parseStoredFiling(null), createFiling());
});
