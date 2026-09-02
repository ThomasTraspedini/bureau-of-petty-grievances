# Agent operating contract

## Scope and precedence

This file governs every agent working inside this repository. Follow it before making changes.

Precedence:

1. Explicit human instructions for the current task.
2. This `AGENTS.md`.
3. Accepted decision records in `docs/decisions/`.
4. The remaining public documentation.

If two sources conflict or a necessary decision is not covered, stop the affected work and ask the human. Do not silently choose a direction.

## Product mission

Bureau of Petty Grievances turns a harmless interpersonal irritation into a precise, delightful, and shareable administrative determination. The leading creative principle is **benevolent overreach**: the Bureau should be desirable and genuinely useful while leaving a small doubt about whether its jurisdiction should exist.

The product language is English. English is the first enabled locale, not a hardcoded architectural assumption.

## Public-repository boundary

This repository is the self-contained product artifact intended for external evaluation.

- Never depend on a sibling workspace, private planning directory, or machine-specific absolute path.
- Never copy private brainstorming, application strategy, raw research, task notes, or hidden source-of-truth documents into this repository.
- Do not mention private filenames or locations in product files, commits, tests, fixtures, build output, or documentation.
- Do not commit credentials, provider keys, personal data, raw production content, or local environment files.
- Public documentation must be sufficient to understand, run, test, and evaluate the product without private context.
- Run `./scripts/validate-repository.sh` before closing every task.

Private context may inform a decision, but the public repository must contain the useful outcome and rationale in its own words.

## Decision protocol

No unapproved assumption may become implementation.

Before changing the repository:

1. Inspect the working tree and preserve unrelated human changes.
2. Read the documents relevant to the affected area.
3. Identify decisions already governed by instructions or accepted records.
4. Present uncovered decisions to the human with a recommendation and meaningful alternatives.
5. Implement only inside the approved decision envelope.

If an ambiguity appears during implementation, pause only the affected path. Continue independent, already-authorized work when safe. Record material accepted decisions; do not create decision records for trivial mechanics already governed by tooling.

## Agent-task releases

The release unit is a completed agent task, not an item in a long-term product roadmap.

- Start at `0.1.0`.
- A planned agent task with committable product changes increments `MINOR`.
- A distinct, unplanned debugging, correction, hardening, or extra task with committable product changes increments `PATCH`.
- Debugging performed inside the original task remains part of that task's single version.
- A task that changes no tracked product file creates no commit, version, changelog entry, or tag.
- A task affecting only private or ignored files does not advance the product version.
- Any `MAJOR` version, including `1.0.0`, requires explicit human approval. An agent may propose it.
- Update `VERSION` and `CHANGELOG.md` in the task's product commit.
- Create an immutable annotated tag named `vX.Y.Z` only after all required checks pass and the commit is complete.

Use Conventional Commit subjects. Keep a task in one coherent commit when practical; use multiple commits only when each is independently meaningful. Stage only task-owned changes.

## Internationalization invariants

Internationalization is foundational, including generative output.

- Never hardcode user-facing copy in components, domain logic, validation, metadata, accessibility labels, social previews, or error handling.
- Represent domain concepts with language-neutral codes and enums.
- Keep interface locale distinct from generated-content locale.
- Make locale explicit in URLs, request boundaries, generation commands, persisted determinations, and test fixtures.
- Treat English as the only initially enabled locale, with explicit fallback behavior.
- Use locale-aware formatting for dates, times, numbers, lists, and plurals.
- Store generated language as a localized snapshot with its locale and prompt version; changing interface locale must not silently translate existing generated content.
- Localize deterministic fallback content and provider-error presentation.
- Organize generative instructions so each locale can own vocabulary, tone, examples, safety evaluation, and editorial constraints while sharing a language-neutral output schema.
- Require locale-specific evaluation before enabling another public language.
- Include pseudo-localization in automated UI checks once a rendering stack exists.

## Architecture principles

- Build vertical, cohesive product capabilities instead of monolithic files or speculative abstraction layers.
- Extract reusable components where a real shared concept exists; do not make a generic component merely to reduce line count.
- Keep domain rules deterministic, inspectable, and independent from frameworks or providers.
- Validate every external boundary at runtime, including routes, persistence, environment configuration, and model output.
- Isolate provider integrations behind owned interfaces.
- Make idempotency, atomic credit accounting, budget enforcement, and recovery explicit server-side concerns.
- Design loading, empty, expired, unavailable, rejected, and exhausted-budget states as first-class product states.
- Preserve a graceful deterministic path when generative services are unavailable.

## TypeScript contract

When TypeScript is introduced:

- enable strict mode, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`;
- do not use `any`, `@ts-ignore`, or unchecked type assertions to bypass design problems;
- derive types from validated schemas where appropriate;
- make invalid domain states unrepresentable where practical;
- keep browser, server, persistence, and provider boundaries explicit;
- automate formatting, linting, type checking, and dependency-boundary checks.

An exception requires explicit human approval and a nearby explanation of why a safer representation is not available.

## Testing contract

Tests specify behavior and invariants, not the current implementation.

- Add unit tests for deterministic domain rules and meaningful edge cases.
- Add integration tests for persistence, transactions, idempotency, validation, and provider adapters.
- Add end-to-end coverage for complete user journeys, recovery paths, and important device sizes.
- Use contract fixtures for generative output; ordinary tests must not depend on a live model call.
- Keep an explicit, opt-in live-provider smoke test for changes to real integration behavior.
- Add automated accessibility and visual-regression coverage when rendered UI exists.
- Test reduced motion, keyboard behavior, content expansion, and pseudo-localization where relevant.
- A newly written test must be able to fail for a plausible regression.

The canonical verification command must be documented and runnable locally. Once the runtime is selected, CI and local task closure must invoke the same underlying checks.

## Error and product-copy contract

- Never expose raw provider, database, framework, or stack traces to users.
- Model errors as typed domain outcomes and map them to localized Bureau copy.
- State what happened, what was preserved, and what the user can do next.
- Preserve entered work whenever safe.
- Never consume a filing credit for a terminal internal failure.
- Keep the Bureau calm, concise, sincere, and helpful. It never winks at the joke or becomes threatening.

## Documentation contract

Update documentation in the same task when behavior, architecture, operations, testing, or an accepted decision changes.

- `README.md` is evaluator-first and concise.
- `docs/product.md` explains the public product contract.
- `docs/architecture.md` describes current system boundaries and material constraints.
- `docs/testing.md` describes executable verification strategy.
- `docs/operations.md` describes deployment, cost, privacy, and recovery expectations.
- `docs/decisions/` contains only durable, useful decisions and their consequences.
- `CHANGELOG.md` describes shipped value, not implementation noise.

Do not create documentation merely to demonstrate that documentation exists.

## Definition of done for every product-changing task

A task is complete only when:

- its agreed acceptance criteria are satisfied;
- relevant automated tests and repository checks pass;
- required manual or visual QA is complete;
- errors and recovery paths affected by the task are handled;
- internationalization boundaries remain intact;
- documentation reflects the resulting system;
- the final diff contains no unrelated changes or private-context leaks;
- version and changelog are correct;
- task changes are committed and the product commit is tagged.
