# Testing strategy

## Purpose

Tests protect product behavior, safety, taste-critical states, and operational invariants. They must be capable of detecting plausible regressions rather than merely reproducing the implementation.

## Quality-gate model

Every product-changing task must run one documented canonical verification workflow. The workflow will grow with the application but must remain reproducible locally and in CI.

At version `0.18.0`, use Node.js 24, install dependencies and the Playwright Chromium, Firefox, and WebKit engines, then run:

```sh
npm ci
npx playwright install chromium firefox webkit
./scripts/validate-repository.sh
```

For subsequent checks with dependencies already installed, the canonical command remains:

```sh
./scripts/validate-repository.sh
```

The canonical workflow includes repository and prototype validation, formatting, linting and dependency-direction rules, strict type checking, focused Vitest component and locale tests, a production build, and Playwright checks. The complete established browser suite and reviewed pixel references run in Chromium. A bounded compatibility contract additionally runs in Firefox and WebKit and covers the essential provider-free filing-to-public-consultation journey, explicit locale routing, mobile and representative desktop viewports, refresh recovery, keyboard access, reduced motion, sharing fallback, and axe-core accessibility. A Chromium-only localization stress contract renders proportionally expanded interface copy at 320 pixels across filing, determination, publication, public consultation, sharing fallback, owner controls, standard access, and unavailable evaluation access. It asserts document and surface containment, essential-action bounds, accessible names, and axe-core results while keeping English as the only public locale. CI invokes the same workflow on Node.js 24.

## Production application verification

Vitest protects the typed locale allowlist, catalog pseudo-localization, placeholder preservation, explicit route navigation, honest shell content, department switching, all enabled department fact variants, server-ready normalization, deterministic assessment, conservative content boundaries, 30-day draft lifecycle, legacy migration, transient determination lifecycle, storage tampering, public-record identity and lifecycle rules, PostgreSQL persistence, recovery, and component validation. Playwright exercises the production build rather than a test-only rendering path.

Assessment tests cover every enabled grammar and the timing, communication, household, option-veto, decision-drift, and revision-notice severity boundaries; one-level consequence escalation and its cap; non-cancelling mitigation; remedy families and prohibitions; personal and professional privacy constraints; presentation bounds; repeatability; and exclusion of unapproved content from variation. Digital tests prohibit message surveillance and compelled availability. Domestic tests prohibit household surveillance, hygiene and food control, property disposal, financial penalties, and safety, access, care, health, or work-duty remedies. Social tests prohibit calendar, message, contact, location, attendance, invitation, guest-list, and social-network surveillance; compelled attendance or contact; exclusion; and serious-matter adjudication. Server-boundary tests prove that only runtime-validated input reaches assessment and issuance, fallback completes missing-provider operation, and unexpected failures become typed outcomes.

Determination-language tests cover matching filing and assessment commands, schema and department editorial-policy versions, grounding, locale and disposition, factual-number and lexical anchors, length, hostile free text, restricted claims, tone, and non-binding remedy constraints. Exhaustive supported-combination checks prove the English fallback for all enabled offences, severity bands, impacts, mitigations, and relationship contexts. Independent curated Chronology fixtures establish representative Bureau language; Digital Conduct, Domestic Affairs, and Social Planning exercise their complete deterministic fallbacks and stricter privacy and safety boundaries.

Provider and orchestration tests exercise the exact non-persistent Luna Structured Outputs request, response parsing, refusal and timeout normalization, missing configuration, one bounded retry, categorical correction feedback, fallback selection, and exclusion of raw provider text. Ordinary tests inject provider results and make no network call.

The filing browser journey covers all phases from a blank alias through an issued determination, explicit department selection, direct correction back to review, draft and determination refresh recovery, exclusion of rejected witness text, unavailable direct navigation, keyboard radio behavior, reduced motion, axe-core accessibility, and mobile and desktop visual references. Complete Digital Conduct, Domestic Affairs, and Social Planning paths render their distinct evidence grammars, publish records, verify bounded share metadata, and prove aliases and excluded facts are absent from preview markup. The journey continues through informed publication, public rendering, categorical reporting, private owner recovery, unpublishing, restoration, permanent deletion, and non-enumerating unavailable rendering. Session tests reject expired or altered facts, assessment, prose, identity, and versions and restore every enabled department snapshot. Browser controls remain disabled until validated state has loaded, and the browser test server explicitly clears provider credentials so ordinary verification cannot make a paid call.

Database integration tests run schema version `6` against isolated in-memory PGlite databases. Public-record coverage proves department persistence, atomic rollback, publication idempotency, snapshot revalidation, credential hashing, wrong-credential rejection, owner and Bureau transition authority, report idempotency, consultation zero state, digest privacy, immutable same-key replay, exact concurrent aggregates, lifecycle gating and restoration, expiry without implicit deletion, and hard-delete cascade semantics using PostgreSQL constraints and transactions. Browser tests use one isolated temporary file-backed PGlite database per Playwright run so the production server boundary is exercised without an external account or stale local state. Public and management pages are checked for `noindex`, `no-store`, accessibility, and separate public and private addresses.

Evaluation-access tests cover bearer and identifier grammars, fragment removal, digest-only link exchange, bounded session expiry, revocation, exhaustion, daily HMAC network pseudonyms, and fail-safe missing production configuration. SQL concurrency tests prove that exact duplicates and distinct filings cannot reserve more than one available logical credit, global attempt dispatch cannot exceed its hard limit, retries preserve one key, fallback and internal failure refund the logical reservation, and already-dispatched attempt units remain consumed. Threshold tests exercise exact 75, 90, and 100 percent crossings without case content. Controlled orchestration tests prove every configured provider call passes through the dispatch guard, while anonymous, unavailable, disabled, and exhausted paths remain provider-free fallback. Component verification covers localized preserved rate-limit recovery. Chromium verifies a clean evaluator-link exchange, immediate credential removal, an `HttpOnly` session, localized invalid access, responsive presentation, and `noindex` metadata.

Standard-access tests prove one-use digest-only authorization, one fixed five-credit entitlement, provider-only transfer qualification, fallback refund without qualification, pending-use suspension, cancellation, replacement, expiry restoration, separate issuance disablement, and atomic single-claim transfer. Concurrent claims must create one new tenure over the original counters and never another pool. Component and pseudo-localization tests cover active, locked, pending, exhausted, claimed, transferred, disabled, and unavailable states. Chromium redeems a clean fragment link, verifies its `HttpOnly` session and responsive accessible presentation, then uses two browser contexts to prove the exact residual balance moves while the former holder loses paid authority.

Product-analytics tests prove the schema-version-4 exact event allowlist, all enabled categorical paths, rejection of submitted Domestic and Social measures, unknown properties, and stale browser events, tab-scoped identity, same-origin bounded collection, deterministic purpose-separated pseudonyms, explicit configuration, regional server delivery, idempotent event identifiers, versioned token-cost estimation, and exclusion of content-shaped fields. Controlled filing tests verify categorical outcome, latency, path, attempt, fallback, token, and model observations while proving observer failure cannot change completion. Sharing coverage protects bounded `via=share` attribution while keeping the displayed canonical address unchanged. Ordinary tests use recording fetches or disabled runtime configuration and never call Mixpanel.

Sharing tests prove the department-discriminated descriptor allowlist, exclusion of identifying and owner data, Digital Conduct content exclusion, Domestic Affairs correction-effort exclusion, and Social Planning alternative-count exclusion from previews; locale-owned metadata copy; canonical-origin validation; native-share success and cancellation; clipboard fallback; and manual address selection. Browser coverage inspects canonical, Open Graph, and social-card tags; fetches the dynamic PNG; verifies its dimensions, content type, revision, and `no-store` policy; and confirms that a fresh image request and record metadata become unavailable after unpublishing. Mobile, desktop, pseudo-localized, accessibility, and 1200 by 630 visual references protect the complete share surface.

Consultation tests prove the exact approved position set, real zero counts, bounded percentages, strict key validation, digest-only persistence, immutable idempotency, concurrent response accuracy, record-lifecycle gating, restoration, deletion cascade, failed-submission retry, browser-state recovery, and pseudo-localized expansion. The complete browser journey submits without an account, observes the aggregate update, verifies refresh recovery and reduced motion, checks accessibility, and confirms that temporarily unpublished results return intact after restoration. Mobile and desktop public-record references protect the integrated consultation surface.

Visual references use the self-hosted production fonts, disable motion, and remain a single Chromium contract with a one-percent pixel-difference tolerance for platform rasterization. Two focused 320-pixel references preserve the first viewport of the expanded landing and public-record surfaces; Firefox and WebKit use behavioral, viewport, and accessibility assertions rather than separate screenshots. Reference images change only after manual inspection at the affected viewport.

## Prototype verification

`./scripts/validate-prototype.sh` checks:

- reversible journey-step ordering and required mitigating context;
- bounded and restricted witness statements;
- deterministic presentation parameters derived from submitted chronology facts;
- consultation updates that preserve approved positions and prior state;
- runtime validation of browser-stored drafts;
- coverage of statically referenced localized interface messages;
- an explicit locale route with copy outside view markup;
- the reduced-motion contract and separation of recovery, consultation, sharing, and successor copy.

Manual review covers the complete journey at a 390-pixel mobile viewport and representative desktop states at 1440 pixels, including keyboard-reachable controls, content expansion, determination reveal, consultation feedback, public sharing, private successor authorization, rejection, and recovery.

## Test layers

### Domain tests

Use table-driven cases, boundary values, and property-style invariants for:

- adaptive-question branching;
- determination scoring and remedy constraints;
- aggravating and mitigating factors;
- stable procedural identity;
- locale-neutral domain codes;
- data-lifecycle transitions.

### Integration tests

Exercise real boundaries under controlled infrastructure:

- persistence mappings and transactions;
- credit reservation, refund, and concurrency;
- idempotent generation requests;
- schema and locale validation;
- model-adapter success, refusal, malformed output, timeout, and retry behavior;
- reporting and unpublishing;
- analytics redaction.

### End-to-end tests

Protect complete journeys, not isolated clicks:

- landing to completed determination;
- evaluation access without visible quota friction;
- one-use standard access and residual-balance successor transfer;
- correction and back navigation without lost state;
- provider failure followed by localized fallback or safe retry;
- public-record viewing and consultation without an account;
- reporting and unavailable-record behavior;
- mobile and desktop rendering;
- keyboard and reduced-motion behavior.

### Visual and accessibility tests

Visual quality is a product requirement. Once screens exist:

- capture intentional mobile and desktop reference states;
- test content expansion and pseudo-localization;
- verify focus, names, roles, contrast, reading order, and reduced motion;
- use automated checks as a floor and manual review for taste and comprehension.

Reference images must change only after explicit visual review, never as an automatic response to a failed diff.

## Generative-system testing

Ordinary tests must not call a live model.

- Use representative structured fixtures at the owned provider boundary.
- Validate grounding against submitted facts.
- Test prohibited content and hostile free text.
- Test field lengths, schema evolution, locale, and editorial constraints.
- Test deterministic fallback as a complete supported path.
- Maintain an opt-in live-provider smoke suite for integration changes.
- Add locale-specific eval cases before enabling any new public language.

Model quality evaluation should compare candidate behavior against curated cases. A passing schema is necessary but not sufficient evidence of a good determination.

The live OpenAI smoke is intentionally outside canonical verification and consumes provider usage. With deliberate local credentials, run:

```sh
npm run test:provider:live
```

It exercises one safe fixture and fails unless validated provider output—not fallback—is returned. `BUREAU_OPENAI_MODEL` may select a candidate model; promotion still requires review against the curated English cases.

## Regression standard

Every defect fix must first be represented by a failing test at the lowest layer that proves the actual invariant. Avoid snapshots of large opaque structures when focused assertions explain the intended behavior more clearly.

Coverage percentages may expose blind spots but do not define completion. Risk, branches, failure modes, and state transitions determine useful coverage.
