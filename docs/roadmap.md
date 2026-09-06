# Capability roadmap

## Purpose

This roadmap describes the ordered evolution of the product. It is useful to evaluators and provides enough state for an agent to select the next capability without private planning context.

It is not a dated delivery plan, a promise that each capability fits one task, or a record of internal task activity. Each increment must leave the product coherent and usable. A capability remains `in_progress` across as many agent tasks as necessary to make its stated outcome true.

## Status model

- `complete` — the capability outcome is true in the current product.
- `in_progress` — this is the only capability currently being advanced.
- `ready` — dependencies are complete and this is the next capability to begin.
- `queued` — ordered but waiting for one or more dependencies.

While unfinished capabilities remain, exactly one capability must be selectable: either one `in_progress` capability or one `ready` capability. Continue `in_progress` work before selecting new work. When a capability completes, the next selection is the first queued row in table order whose dependencies are complete.

When every capability is `complete`, no capability is selectable and no next task is required. Do not create artificial work to keep the roadmap active.

## Capabilities

| ID | Capability | Outcome | Depends on | Status |
| --- | --- | --- | --- | --- |
| C00 | Project operating system | The repository has explicit product, decision, testing, internationalization, release, and agent contracts. | — | complete |
| C01 | Product and interaction prototype | The complete primary journey is rendered on mobile and key desktop states, establishing interaction, visual identity, copy hierarchy, motion intent, and evidence for stack selection. | C00 | complete |
| C02 | Application foundation | The approved stack runs a localized, strictly typed, automatically verified application shell that can host vertical product capabilities. | C01 | complete |
| C03 | Adaptive filing | A filer can complete, review, correct, and preserve a localized adaptive grievance intake for the first enabled department. | C02 | complete |
| C04 | Deterministic determination | Validated structured facts produce an inspectable assessment, accepted factors, remedy constraints, and stable presentation parameters. | C03 | complete |
| C05 | Locale-aware generative pipeline | The Bureau produces grounded structured language through locale-specific guidance, validation, bounded retries, and a complete deterministic fallback. | C04 | complete |
| C06 | Determination experience | A completed filing resolves into a polished, localized determination with procedural identity, fact reconstruction, designed loading, failure, and reveal states. | C05 | complete |
| C07 | Persistent public record | Determinations persist behind unguessable public identifiers with explicit lifecycle, unlisted rendering, reporting, unpublishing, and deletion behavior. | C06 | complete |
| C08 | Sharing and social preview | A determination becomes a recognizable share object with localized social metadata and no exposure of private access credentials. | C07 | complete |
| C09 | Public consultation | Visitors can contribute one of the three approved positions without an account, with atomic results and proportionate repeat-response resistance. | C07 | complete |
| C10 | Evaluation access and cost control | Evaluators enter without visible friction while credits, idempotency, rate limits, global budget, refund, alerts, and kill switches protect paid actions. | C07 | complete |
| C11 | Standard access and successor invitations | Standard users can redeem filing access and transfer one finite residual allowance along a non-branching successor chain without exposing invitation credentials on public records. | C10 | complete |
| C12 | Observability and learning | Product and operational events reveal journey health, failures, cost, and behavior without collecting raw personal case content. | C10 | complete |
| C13 | Department expansion | Chronology, Digital Conduct, Domestic Affairs, and Social Planning each have polished adaptive logic and a distinct fact-visualization grammar within one Bureau identity. | C06 | complete |
| C14 | Cross-journey resilience and refinement | Complete journeys meet the visual, responsive, accessibility, reduced-motion, pseudo-localization, recovery, and regression-testing bar across supported browsers. | C08, C09, C10 | in_progress |
| C15 | Evaluation release | A stable hosted experience, clean-browser verification, evaluator-ready repository, and concise walkthrough make the complete evidence package accessible without coordination. | C14 | queued |

Dependencies express the minimum ordering currently supported by product evidence. A later accepted decision may change them; update this roadmap and record material rationale in the same task.

## Remaining completion work

C00–C13 are implemented; there is no missing feature phase. C14 remains open for the approved physical-device evidence matrix and release-relevant verification of existing refinements. Implemented changes awaiting verification and release closure must not be reimplemented.

C15 follows C14 in two cohesive sequential units:

1. Hosted deployment and operational verification using the existing application and persistence boundaries.
2. Evaluator evidence: clean-browser access verification, accessible live and repository links, and a walkthrough of at most 60 seconds.

These units do not add capabilities or expand product scope. Mark each capability complete only when its outcome is evidenced.

## Cross-cutting invariants

These are part of every capability rather than deferred to C14:

- visual and product taste;
- English-default internationalization with complete English, Italian, French, German, Spanish, and Brazilian Portuguese product locales;
- designed errors and recovery;
- safety and privacy boundaries;
- deterministic testability;
- strict types and automated verification once implementation exists;
- bounded generative cost;
- public/private repository separation.

C14 is a whole-journey hardening capability, not permission to postpone quality.
