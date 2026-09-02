# Testing strategy

## Purpose

Tests protect product behavior, safety, taste-critical states, and operational invariants. They must be capable of detecting plausible regressions rather than merely reproducing the implementation.

## Quality-gate model

Every product-changing task must run one documented canonical verification workflow. The workflow will grow with the application but must remain reproducible locally and in CI.

At version `0.5.0`, use Node.js 24, install dependencies and the Playwright Chromium browser, then run:

```sh
npm ci
npx playwright install chromium
./scripts/validate-repository.sh
```

For subsequent checks with dependencies already installed, the canonical command remains:

```sh
./scripts/validate-repository.sh
```

The canonical workflow includes repository and prototype validation, formatting, linting and dependency-direction rules, strict type checking, focused Vitest component and locale tests, a production build, and Playwright checks. Browser checks cover explicit locale routing, localized metadata, unsupported routes, keyboard access, reduced motion, axe-core accessibility, and reviewed mobile and desktop visual references. CI invokes the same workflow on Node.js 24.

## Production application verification

Vitest protects the typed locale allowlist, catalog pseudo-localization, placeholder preservation, explicit route navigation, honest shell content, adaptive Chronology fact variants, server-ready normalization, deterministic assessment, conservative content boundaries, 30-day draft lifecycle, storage tampering, recovery, and component validation. Playwright exercises the production build rather than a test-only rendering path.

Assessment tests cover every Chronology grammar, the 14/15- and 29/30-minute severity boundaries, one-level consequence escalation and its cap, non-cancelling mitigation, remedy families and prohibitions, personal and professional privacy constraints, timeline bounds, repeatability, and exclusion of aliases, prose, relationship, and exact clock times from presentation variation. A server-boundary test proves that only runtime-validated input reaches assessment and that acceptance still does not issue a determination.

The filing browser journey covers all phases from a blank alias through server-validated completion, direct correction back to review, refresh recovery, exclusion of rejected witness text, unsupported step routes, keyboard radio behavior, reduced motion, axe-core accessibility, and mobile and desktop visual references. Browser controls remain disabled until the validated draft has loaded; this protects against recovery overwriting an immediate first input.

Visual references use the self-hosted production fonts, disable motion, and are shared across supported test platforms with a one-percent pixel-difference tolerance for platform rasterization. Reference images change only after manual inspection at the affected viewport.

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

## Regression standard

Every defect fix must first be represented by a failing test at the lowest layer that proves the actual invariant. Avoid snapshots of large opaque structures when focused assertions explain the intended behavior more clearly.

Coverage percentages may expose blind spots but do not define completion. Risk, branches, failure modes, and state transitions determine useful coverage.
