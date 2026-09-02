# Architecture constraints

## Status

The application stack has not been selected. It will be chosen after the first complete interaction direction is rendered and evaluated. This document records system boundaries that remain valid across reasonable stack choices.

## Architectural goals

- Fast mobile-first rendering with strong desktop presentation.
- A complete journey that survives provider and network failure.
- Server-side protection of generative credentials, quotas, and policy.
- Deterministic, testable domain decisions before generative language.
- Persistent public records and consultation responses.
- Bounded cost and operationally simple deployment.
- Explicit locale flow across every boundary.
- Clear vertical ownership without framework-shaped monoliths.

## Product capabilities

The system should evolve through cohesive capabilities:

- `access`: evaluation sessions, standard filing credentials, credits, and invitations;
- `filing`: adaptive questions, draft preservation, validation, and review;
- `determination`: deterministic assessment, generative wording, validation, and fallback;
- `identity`: stable procedural identity and department-specific fact visualization;
- `public-record`: unlisted rendering, social metadata, reporting, and unpublishing;
- `consultation`: anonymous participation, repeat-vote resistance, and aggregate results;
- `operations`: budgets, rate limits, alerts, feature switches, analytics, and data lifecycle.

These names describe boundaries, not a required folder layout. The eventual structure should keep each capability vertical and move shared concepts only when genuine reuse appears.

## Domain and provider boundaries

The deterministic domain must not depend on a UI framework, database SDK, deployment platform, or model provider.

External boundaries require runtime validation:

- environment configuration;
- route and form input;
- stored records;
- model requests and structured responses;
- analytics payloads;
- public identifiers and access credentials.

Provider adapters translate owned domain commands into external calls. Provider-specific errors must be normalized before entering product behavior.

## Determination pipeline

1. Validate and normalize input with an explicit locale.
2. Enforce content and privacy boundaries.
3. Calculate a deterministic assessment.
4. Reserve credit atomically and enforce budgets.
5. Build a bounded, locale-specific generation request.
6. Request schema-constrained structured output.
7. Validate grounding, tone, lengths, locale, and prohibited content.
8. Retry only under an explicit retry policy.
9. Use localized deterministic fallback after terminal provider failure.
10. Persist the accepted localized snapshot and refund credit when required.

The normal path targets one paid generative request per completed filing. Cost optimization must not reduce output quality; hard bounds protect the budget instead.

## Internationalization boundary

Locale must be explicit rather than inferred from global process state.

A determination record should retain at least:

- content locale;
- prompt or editorial-policy version;
- language-neutral domain inputs;
- accepted localized output;
- deterministic assessment version.

Changing interface locale does not mutate existing generated content. Supporting a new locale requires localized catalogs, deterministic fallback, editorial guidance, prompt evaluation, safety evaluation, and layout verification.

## Identity and public access

Separate identifiers by purpose:

- internal record identity;
- public unguessable record identity;
- private evaluation or invitation credential;
- deterministic visual seed.

A public record must never reveal an invitation or evaluation credential. A visual seed must not encode raw personal content or serve as a public access secret.

## Concurrency and idempotency

Generation and credit changes require an idempotency key and atomic reservation. Repeat submissions must return the established result or safe current state rather than consume another credit.

Consultation updates must be atomic. Repeat-vote resistance should be proportionate and privacy-preserving; it must not create an invasive identity system for a temporary consumer experience.

## Data lifecycle

Records should support explicit lifecycle states such as active, unpublished, archived, and deleted. Retention must remain configurable so the experiment can be continued, exported, or responsibly removed without destructive assumptions embedded in the schema.

## Decisions intentionally deferred

- application framework and runtime;
- persistence provider;
- deployment provider;
- analytics provider;
- concrete localization library and catalog format;
- exact model and model-routing policy;
- detailed rate-limit implementation.

These decisions require rendered product evidence, provider evaluation, or explicit human approval.
