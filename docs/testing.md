# Testing strategy

## Purpose

Tests protect product behavior, safety, taste-critical states, and operational invariants. They must be capable of detecting plausible regressions rather than merely reproducing the implementation.

## Quality-gate model

Every product-changing task must run one documented canonical verification workflow. The workflow will grow with the application but must remain reproducible locally and in CI.

At version `0.1.0`, run:

```sh
./scripts/validate-repository.sh
```

When implementation begins, the canonical workflow must include formatting, linting, strict type checking, unit tests, integration tests, relevant end-to-end tests, a production build, and repository validation.

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
