# 0004 — Public roadmap and private execution queue

## Status

Accepted.

## Context

An evaluator or coding agent receiving only the product repository should understand the intended product evolution and determine what capability is ready next. Detailed agent coordination, unresolved questions, private rationale, and task evidence do not belong in the externally evaluated artifact.

Keeping all planning private would make the product repository less self-sufficient. Publishing the entire execution queue would expose noise and mix product direction with private work management.

## Decision

Use two complementary planning layers:

- The product repository owns an ordered capability roadmap with stable capability identifiers, dependencies, product-level status, and a deterministic selection rule.
- An optional external private workspace owns agent-task identifiers, the exact execution pointer, unresolved questions, private rationale, and completion evidence.

The product repository never depends on the private layer. An agent without private context can derive a coherent task from the selected public capability and repository state.

The human command `next task` selects an existing in-progress capability first; otherwise it selects the unique ready capability whose dependencies are complete. Ambiguous state requires a human decision.

## Consequences

- Evaluators can understand both current state and intended evolution from one clone.
- Coding agents can continue work without requiring hidden filenames or paths.
- Private coordination remains private and may be more granular than the public roadmap.
- Capability and agent-task identifiers must never be treated as interchangeable.
- Roadmap status must be updated with product reality and cannot become aspirational theatre.

## Open considerations

The precise artifact and implementation method for each capability remain subject to its own decision audit. The roadmap chooses what outcome comes next, not every decision required to produce it.
