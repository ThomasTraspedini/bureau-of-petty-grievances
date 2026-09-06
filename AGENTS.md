# Agent operating contract

## Purpose

This contract governs agents working inside the product repository.

The default objective is:

> complete the requested engineering outcome correctly with the smallest necessary scope, context, reasoning, and validation.

Model capability should improve decisions inside the task boundary. It must not automatically increase task size, documentation size, verification breadth, architectural ambition, or certainty-seeking.

High autonomy is expected.

Unbounded depth is not.

---

## Precedence

Follow, in order:

1. Explicit human instructions for the current task.
2. This `AGENTS.md`.
3. Accepted decision records that materially govern the affected area.
4. Relevant public documentation.

Do not load or reconcile lower-precedence material unless it is relevant to the current task.

If a genuine material conflict remains, ask the human about the affected decision. Continue independent authorized work when possible.

---

# Operating modes

Every task runs in one of three modes.

## 1. Analysis / planning / documentation

Use for:

* audits;
* planning;
* task decomposition;
* documentation changes;
* roadmap or queue maintenance;
* decision analysis;
* repository-policy changes.

Default behavior:

* inspect repository evidence;
* edit only relevant planning/documentation files;
* use lightweight structural checks where useful.

Do **not** run:

* the application test suite;
* production builds;
* Playwright or browser suites;
* live-provider checks;
* broad regression validation;

merely to increase confidence.

Investigation does not imply validation.

Execute code only when a specific unresolved question cannot reasonably be answered by inspection, and use the narrowest command that answers that question.

---

## 2. Normal implementation

This is the default mode for product development.

Implement the smallest complete solution satisfying the explicit task and acceptance criteria.

Use targeted validation proportional to the changed behavior.

Do not automatically perform release-level validation.

---

## 3. Release / deployment

Use only when the current task explicitly involves:

* release qualification;
* deployment;
* evaluator delivery;
* broad regression verification;
* a human-requested full gate.

Only this mode normally requires the complete canonical repository validation, broad browser/device checks, release metadata reconciliation, and release tagging.

A normal implementation task does not become a release task merely because tracked product files changed.

---

# Scope budget

Treat the explicit task and its acceptance criteria as a hard working boundary.

Prefer the smallest complete implementation.

Do not:

* redesign working architecture unless required;
* refactor unrelated code;
* generalize for hypothetical future requirements;
* fix unrelated issues discovered during implementation;
* expand a local change into subsystem cleanup;
* introduce new abstractions when existing patterns are sufficient.

If an adjacent issue does not block the task and was not caused by the task:

* leave it unchanged;
* mention it briefly at completion only if materially useful.

Completion means satisfying the requested outcome, not exhausting all possible improvements.

---

# Context budget

Load only context needed for the current task.

At task start:

1. inspect the relevant working-tree state;
2. read this contract;
3. read the selected task or relevant roadmap entry;
4. inspect the code and documents directly governing the affected area.

Then proceed.

Do not automatically read:

* every decision record;
* the entire roadmap;
* all architecture documentation;
* historical completed tasks;
* unrelated test documentation;
* unrelated canonical documents.

Search or inspect narrowly before opening large documents.

Read a decision record only when its subject materially affects the implementation choice.

Do not reread information already established in the current session unless repository changes make it stale.

Documentation is a decision aid, not mandatory context to ingest wholesale.

---

# Decision protocol

Ask the human only when a missing decision is both:

1. material to the requested product outcome; and
2. capable of producing meaningfully different correct implementations.

Examples include:

* user-visible product behavior;
* privacy or security policy;
* irreversible data semantics;
* external contracts;
* paid-provider behavior;
* a material scope change.

Do not stop for ordinary reversible engineering choices when:

* an existing project pattern applies;
* the task already defines the intended outcome;
* one option is clearly the smallest compatible implementation.

Use the existing pattern and continue.

If one path is blocked by a material decision, continue independent authorized work before asking.

Do not ask permission merely to continue work already authorized.

---

# Autonomy

Once implementation starts, continue until the task's explicit completion condition is satisfied.

Do not stop merely to:

* announce the next step;
* report routine progress;
* say that enough information is available;
* summarize incomplete work;
* ask whether to continue;
* request confirmation of an already approved task.

A progress report is not a completion condition.

---

# `next task` protocol

The human command `next task` authorizes selection and execution of the next eligible planned task.

When receiving it:

1. inspect the current working state;
2. identify the current `in_progress` capability or next eligible `ready` capability;
3. read only documentation and decisions that materially govern that capability;
4. select the smallest cohesive task that materially advances it;
5. identify any genuinely blocking material decision;
6. if none exists, begin without reconfirmation.

Do not perform broad project rediscovery merely because a new agent session began.

An `in_progress` capability takes priority over starting a new capability.

When no work remains, a completed roadmap with no next task is valid. Do not invent additional work to preserve the protocol.

---

# Task granularity

A task should normally:

* have one principal observable outcome;
* concern one subsystem or tightly related behavior;
* require a bounded conceptual working set;
* have explicit acceptance criteria;
* be verifiable with targeted checks.

Task size is based on conceptual breadth, not file count.

A mechanical change across many files may be small.

A change involving several independent behaviors may be too large even when few files are touched.

Do not create large tasks simply because the model can manage them.

---

# Verification budget

Validation must answer:

> Is there concrete evidence that this task is incomplete or incorrect?

For normal implementation, prefer:

1. tests directly covering changed behavior;
2. relevant type checking or static analysis;
3. affected package/module validation where appropriate;
4. broader checks only when evidence suggests wider impact.

Once appropriate targeted checks pass, stop.

Do not automatically:

* run every test suite;
* repeat successful commands;
* run unrelated package tests;
* perform broad regression analysis;
* inspect unrelated warnings;
* broaden validation merely because additional validation exists.

Escalate only when:

* targeted validation fails;
* a shared contract or infrastructure layer changed;
* an unexpected dependency appears;
* the current task explicitly requires broader evidence.

The full repository gate is a release-level tool, not the default closure step for every task.

---

# Testing contract

Tests protect changed behavior and durable invariants.

For the current task:

* add or modify tests when changed behavior needs meaningful protection;
* prefer focused regression or behavioral tests;
* reuse existing test infrastructure and patterns;
* ensure newly written tests can fail for a plausible regression.

Do not add unrelated test categories simply because the repository supports them.

Integration, E2E, live-provider, accessibility, visual-regression, reduced-motion, keyboard, content-expansion, and pseudo-localization checks apply when the current change materially affects those concerns.

They are not a mandatory checklist for every task.

Ordinary automated tests must not depend on live model calls.

---

# Diff review

Review the completed diff once.

Check for:

* accidental unrelated changes;
* incomplete task implementation;
* obvious inconsistencies with established patterns;
* private-context leaks;
* unmet acceptance criteria.

Do not turn routine diff review into a new architecture, cleanup, or optimization task.

If the diff is scoped correctly and targeted validation passes, finish.

---

# Documentation

Update documentation only when its truth materially changed.

Prefer:

* updating one authoritative location;
* concise references;
* invariants and non-obvious decisions;

over:

* repeating implementation details;
* documenting code that is cheap to inspect;
* updating unrelated documents for completeness;
* creating documentation merely to demonstrate process maturity.

Relevant document roles remain:

* `README.md`: concise evaluator entry point;
* `docs/product.md`: public product contract;
* `docs/roadmap.md`: capability state and dependency truth;
* `docs/architecture.md`: current material system boundaries;
* `docs/testing.md`: verification strategy;
* `docs/operations.md`: deployment, cost, privacy, recovery;
* `docs/decisions/`: durable decisions and consequences;
* `CHANGELOG.md`: shipped value.

Do not perform a broad documentation synchronization pass after every implementation.

---

# Public-repository boundary

This repository must remain a self-contained public product artifact.

* Never depend on private sibling workspaces or machine-specific absolute paths.
* Never expose private planning, raw research, rejected alternatives, application strategy, or private filenames.
* Do not commit credentials, provider keys, personal data, raw production content, or local environment files.
* Public documentation must be sufficient to run and evaluate the product.

This boundary is mandatory regardless of task size.

---

# Internationalization invariants

Internationalization remains foundational where affected by the task.

* Do not hardcode user-facing copy.
* Keep domain concepts language-neutral.
* Keep interface locale distinct from generated-content locale.
* Keep locale explicit at relevant request, persistence, generation, and routing boundaries.
* Store generated language with its locale and prompt/version identity.
* Localize deterministic fallback and provider-error presentation.
* Preserve locale-aware formatting.
* Preserve language-neutral model output schemas.
* Require locale-specific evaluation before enabling a new public locale.

Do not perform unrelated i18n work when the current task does not touch these boundaries.

---

# Architecture invariants

Preserve these principles when relevant:

* cohesive vertical capabilities;
* no speculative abstraction;
* deterministic and inspectable domain rules;
* runtime validation at actual external boundaries;
* provider isolation behind owned interfaces;
* explicit server-side idempotency, budget enforcement, credit accounting, and recovery;
* graceful deterministic behavior when generative services are unavailable.

These are design constraints, not instructions to audit the entire architecture on every task.

---

# TypeScript invariants

Where TypeScript is affected:

* preserve strict mode;
* preserve `noUncheckedIndexedAccess`;
* preserve `exactOptionalPropertyTypes`;
* do not use `any`, `@ts-ignore`, or unsafe assertions to bypass design problems;
* keep browser/server/persistence/provider boundaries explicit;
* derive types from validated schemas where appropriate.

Do not perform unrelated TypeScript cleanup.

---

# Error and product-copy invariants

Where affected:

* do not expose provider/database/framework internals to users;
* represent errors as typed product outcomes;
* preserve user work when safe;
* do not consume filing credit for terminal internal failures;
* keep Bureau copy calm, concise, sincere, and helpful.

---

# Task completion

A normal implementation task is complete when:

* its explicit acceptance criteria are satisfied;
* appropriate targeted validation passes;
* affected documentation is truthful;
* the final diff contains no unrelated changes or private-context leaks;
* no task-created blocker is known.

Stop at that point.

Do not continue merely because further improvement or verification is possible.

---

# Release completion

For an explicitly designated release/deployment task, additionally perform the release requirements relevant to that release, which may include:

* the canonical full repository gate;
* required browser/device/manual evidence;
* deployment verification;
* version and changelog reconciliation;
* commit and annotated tag.

Release work should normally be performed once for the release boundary, not repeatedly for every preceding implementation task.
