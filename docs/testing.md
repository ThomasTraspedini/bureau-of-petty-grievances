# Testing strategy

## Choose the verification boundary

Follow the operating mode in [AGENTS.md](../AGENTS.md). Validation establishes the requested acceptance criteria; it does not automatically qualify a release.

- **Planning/documentation:** formatting of changed documents, link/status consistency, and `./scripts/validate-repository.sh --checks-only`. This mode checks required files, version consistency, roadmap state and repository hygiene without running prototype or application tests.
- **Implementation:** run tests covering the changed behavior and relevant static checks. Build or broaden verification only for an affected rendering/runtime boundary, a shared contract change, a failure, or other concrete regression evidence.
- **Release/deployment:** run the full gate once on the release candidate, then the required deployed or physical-device checks. Do not repeat a passing gate for unchanged private evidence or task records.

Example targeted commands with dependencies installed:

```sh
npx prettier --check docs/testing.md
npm run test -- tests/draft-storage.test.ts tests/determination-session.test.ts
npm run typecheck
npx eslint src/features/filing/draft-storage.ts
```

Select only commands relevant to the task. For a rendered change, build the candidate when needed and select the affected Playwright file or named scenario, for example:

```sh
npm run test:e2e -- tests/e2e/filing-journey.spec.ts --project=chromium --grep "reviews a completed filing"
```

## Behavior-to-test index

Paths below are under `tests/`; wildcard names identify related files, not mandatory suites.

| Changed behavior | Start with |
| --- | --- |
| Filing rules and deterministic assessment | `*-filing.test.ts`, `*-assessment.test.ts` for the affected department |
| Draft recovery and completed-filing restart | `draft-storage.test.ts`, `determination-session.test.ts`, `filing-journey.test.tsx`; restart scenario in `e2e/filing-journey.spec.ts` |
| Language and provider orchestration | `determination-language.test.ts`, affected locale language tests, `openai-determination-language.test.ts`, `generate-determination-language.test.ts`, `complete-filing-action.test.ts` |
| Determination presentation and evaluator diagnostics | `determination-experience.test.tsx`, affected determination/session and browser scenarios |
| Persistence and record lifecycle | `public-record.test.ts`, relevant lifecycle scenarios in `e2e/filing-journey.spec.ts` |
| Sharing and consultation | `public-record-sharing.test.tsx`, `public-record-consultation.test.tsx`, affected public-record browser scenarios |
| Access, accounting and successor transfer | `evaluation-access.test.ts`, `standard-access.test.ts`, `generation-idempotency.test.ts`, related component tests |
| Analytics privacy and failure isolation | `product-analytics.test.ts`, `surface-observer.test.tsx` |
| Locale boundaries and catalogs | `locale-contract.test.ts`, affected locale language tests and `e2e/*-locale.spec.ts` |
| Browser-owned behavior | `e2e/browser-compatibility.spec.ts` |
| Exact failure recovery | `e2e/failure-recovery.spec.ts`, `e2e-failure-injection.test.ts` |
| Narrow layouts and expanded copy | `e2e/pseudo-localized-narrow-layout.spec.ts`, affected visual scenario |

Use existing fixtures and meaningful boundary/regression assertions. Add tests only for plausible regressions in changed behavior; do not duplicate coverage or create speculative matrices.

## Full release gate

Use Node.js 24. Initial setup:

```sh
npm ci
npx playwright install chromium firefox webkit
```

The canonical release command is:

```sh
./scripts/validate-repository.sh --full
```

Omitting the flag preserves the same full-gate behavior used by CI. It runs lightweight repository checks, prototype validation, formatting, lint/import boundaries, strict types, Vitest, the production build and Playwright. Configuration lives in `package.json`, `vitest.config.ts`, `playwright.config.ts` and `.github/workflows/verify.yml`.

Ordinary verification makes no live provider call. Database integration uses isolated PGlite PostgreSQL semantics and the current migrations in `src/server/public-record/schema.ts`; Playwright uses an isolated temporary store and explicitly disables provider credentials. Deployment verification must separately establish the production database and proxy/origin configuration.

## Browser and visual contracts

Chromium owns the complete browser suite and pixel references. Firefox and WebKit run the bounded essential journey only; do not multiply all scenarios or image baselines across engines. See [decision 0020](decisions/0020-supported-browser-verification-baseline.md).

Relevant scenarios cover keyboard behavior, reduced motion, axe-core accessibility, refresh recovery, localized routes, exact retry and 320-pixel pseudo-localization. Failure injection and pseudo-localization require both the dedicated test-server setting and request instruction; neither is an ordinary product mode.

Visual references use bundled fonts, disabled motion and a one-percent pixel tolerance. Update a reference only after manual inspection of the affected viewport, never automatically to clear a failure. Browser-engine automation does not establish physical-device support. The approved owner-led five-environment matrix and disposition of its release-relevant findings are complete; a professional moderated study is not required.

The retained prototype is interaction evidence. Run `./scripts/validate-prototype.sh` when prototype behavior changes or as part of the full gate; do not repeat its manual journey for unrelated production tasks.

## Deliberate provider evaluation

Provider integration changes use injected outcomes for ordinary tests. A live smoke is separate, consumes provider usage, and is appropriate only when deliberately qualifying the real integration:

```sh
npm run test:provider:live
```

It loads `.env` if present and requires `OPENAI_API_KEY`. It exercises one safe fixture per enabled locale and requires validated provider output rather than fallback. The configured model defaults to `gpt-5.6-terra`; model/prompt changes also need editorial and safety review of the relevant curated cases. Metadata and grounding remain deterministic. See [decision 0023](decisions/0023-personalized-determination-language.md).

No current release claim should be inferred from historical test counts. Record results against the candidate actually verified, including any blocked checks.
