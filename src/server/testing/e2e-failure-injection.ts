export const E2E_FAILURE_INSTRUCTION_HEADER =
  "x-bureau-e2e-failure-instruction";

export const E2E_FAILURE_POINTS = [
  "complete_filing",
  "publish_public_record",
  "submit_public_consultation",
] as const;

export type E2eFailurePoint = (typeof E2E_FAILURE_POINTS)[number];

const consumedInstructions = new Set<string>();
const instructionPattern =
  /^(complete_filing|publish_public_record|submit_public_consultation):([a-z0-9][a-z0-9_-]{7,63})$/u;

export function consumeE2eFailureInstruction(
  requestHeaders: Headers,
  point: E2eFailurePoint,
): boolean {
  if (process.env.BUREAU_E2E_FAILURE_INJECTION !== "1") return false;

  const instruction = requestHeaders.get(E2E_FAILURE_INSTRUCTION_HEADER);
  if (instruction === null) return false;

  const match = instructionPattern.exec(instruction);
  if (match?.[1] !== point) return false;
  if (consumedInstructions.has(instruction)) return false;

  consumedInstructions.add(instruction);
  return true;
}
