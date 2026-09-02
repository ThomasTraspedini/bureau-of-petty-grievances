# Architecture constraints

## Status

The first complete interaction direction remains rendered as a repository-native prototype. The production application uses the accepted Next.js foundation described in decision 0006 and now carries the deterministic assessment boundary described in decision 0008. The prototype remains evidence; production capabilities enter through explicit application, localization, domain, server, and provider boundaries.

## Application foundation

The production shell uses Next.js 16 App Router, React, strict TypeScript, and `next-intl` on the Node.js 24 LTS line. npm owns the reproducible lockfile. Native CSS preserves the approved visual system, while `next/font/local` bundles the repository's Public Sans, Source Serif 4, and IBM Plex Mono files without an external font request.

`/en` is the first enabled application route. The root redirects to it, unsupported paths resolve to a localized unavailable state, and the route locale controls the document language, catalog, metadata, and navigation. Catalog types are derived from the English reference catalog, and a pseudo-localization transform exercises content expansion without enabling an unevaluated public language.

Current source ownership is deliberately small:

- `src/app` adapts routes and framework rendering;
- `src/features` owns vertical user-facing application surfaces;
- `src/i18n` owns locale validation, catalogs, navigation, and test-only pseudo-localization support;
- `src/domain` owns deterministic filing and assessment policy and remains independent of React, Next.js, server, and provider imports;
- future `src/providers` adapters may not import application routes or feature views.

## Adaptive filing boundary

The production Chronology journey lives at validated `/{locale}/file/{step}` routes. Route codes and stored domain values are language-neutral; localized catalogs provide all visible labels, instructions, errors, accessibility text, and review summaries.

`src/domain/filing` owns the framework-independent draft shape, three discriminated Chronology fact variants, normalization, structural limits, and conservative harmless-content boundaries. The filing feature owns route progress, responsive controls, review presentation, and a versioned device-local storage envelope. Stored drafts carry their locale and update time, expire after 30 days, and are runtime-validated before entering application state. Rejected witness text is excluded from storage while the rest of a safe draft remains recoverable.

The reviewed filing crosses a server action and is validated again through the same domain boundary. Invalid input returns typed rejection; accepted input returns its deterministic assessment. The action does not persist content or assessment, reserve a credit, issue final determination language, or call a provider. A short-lived session marker allows the accepted client to render completion; direct navigation without that marker returns to review.

## Deterministic assessment boundary

`src/domain/determination` transforms a validated Chronology filing into assessment policy version `1`. It normalizes all three fact variants into a comparable discrepancy, applies inspectable severity thresholds and a single capped consequence adjustment, records mitigation without allowing it to erase facts, and returns offence- and relationship-aware remedy constraints.

The same output carries bounded timeline presentation parameters and a stable four-way visual variant. The seed is derived only from language-neutral assessment inputs approved for variation; aliases, witness prose, relationship context, and exact clock times cannot influence it. The assessment includes no localized prose and imports no framework, persistence, or provider code.

Any rule change that can alter assessment output requires a new policy version. Later generation and fallback stages consume this owned contract rather than reinterpret raw filing fields or invent remedy authority.

ESLint enforces the domain and provider import direction before those later boundaries acquire implementation. This avoids speculative interfaces while making their allowed dependency direction explicit.

## Prototype evidence

The interaction prototype establishes several implementation requirements without choosing a framework:

- `/prototype/en/` demonstrates an explicit locale route and a separate English interface catalog;
- the complete Chronology journey preserves and corrects a device-local draft before review;
- determination language and procedural reconstruction respond to structured prototype facts;
- public consultation remains separate from the official determination;
- public-result sharing and private successor authorization are distinct surfaces;
- content rejection and terminal failure preserve work and state credit consequences explicitly;
- mobile and desktop compositions share one identity while changing layout deliberately;
- motion communicates state and has a reduced-motion equivalent.

The prototype uses static browser modules only. Its state model, storage, validation, and URLs are interaction evidence rather than a production architecture.

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

- persistence provider;
- deployment provider;
- analytics provider;
- exact model and model-routing policy;
- detailed rate-limit implementation.

These decisions require rendered product evidence, provider evaluation, or explicit human approval.
