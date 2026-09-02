# Architecture constraints

## Status

The first complete interaction direction remains rendered as a repository-native prototype. The production application uses the accepted Next.js foundation and now connects filing, deterministic assessment, locale-aware language, transient issuance, persistent public records, sharing, and public consultation described in decisions 0006 through 0013. The prototype remains evidence; production capabilities enter through explicit application, localization, domain, server, provider, and persistence boundaries.

## Application foundation

The production shell uses Next.js 16 App Router, React, strict TypeScript, and `next-intl` on the Node.js 24 LTS line. npm owns the reproducible lockfile. Native CSS preserves the approved visual system, while `next/font/local` bundles the repository's Public Sans, Source Serif 4, and IBM Plex Mono files without an external font request.

`/en` is the first enabled application route. The root redirects to it, unsupported paths resolve to a localized unavailable state, and the route locale controls the document language, catalog, metadata, and navigation. Catalog types are derived from the English reference catalog, and a pseudo-localization transform exercises content expansion without enabling an unevaluated public language.

Current source ownership is deliberately small:

- `src/app` adapts routes and framework rendering;
- `src/features` owns vertical user-facing application surfaces;
- `src/i18n` owns locale validation, catalogs, navigation, and test-only pseudo-localization support;
- `src/domain` owns deterministic filing and assessment policy and remains independent of React, Next.js, server, and provider imports;
- `src/providers` translates owned language commands into external requests and may not import application routes or feature views;
- `src/server` orchestrates bounded provider attempts, validation, fallback, and the owned persistence repository without moving provider or database concerns into domain policy.

## Adaptive filing boundary

The production Chronology journey lives at validated `/{locale}/file/{step}` routes. Route codes and stored domain values are language-neutral; localized catalogs provide all visible labels, instructions, errors, accessibility text, and review summaries.

`src/domain/filing` owns the framework-independent draft shape, three discriminated Chronology fact variants, normalization, structural limits, and conservative harmless-content boundaries. The filing feature owns route progress, responsive controls, review presentation, and a versioned device-local storage envelope. Stored drafts carry their locale and update time, expire after 30 days, and are runtime-validated before entering application state. Rejected witness text is excluded from storage while the rest of a safe draft remains recoverable.

The reviewed filing crosses a server action and is validated again through the same domain boundary. Invalid input returns typed rejection. Accepted input continues through deterministic assessment and locale-aware language orchestration before returning a complete transient determination. That action does not persist content, reserve a credit, create a public identifier, or claim external investigation; persistence requires a separate informed publication action.

## Deterministic assessment boundary

`src/domain/determination` transforms a validated Chronology filing into assessment policy version `1`. It normalizes all three fact variants into a comparable discrepancy, applies inspectable severity thresholds and a single capped consequence adjustment, records mitigation without allowing it to erase facts, and returns offence- and relationship-aware remedy constraints.

The same output carries bounded timeline presentation parameters and a stable four-way visual variant. The seed is derived only from language-neutral assessment inputs approved for variation; aliases, witness prose, relationship context, and exact clock times cannot influence it. The assessment includes no localized prose and imports no framework, persistence, or provider code.

Any rule change that can alter assessment output requires a new policy version. Language generation and fallback consume this owned contract rather than reinterpret raw filing fields or invent remedy authority.

ESLint enforces the domain and provider import direction. The provider adapter cannot import routes or feature views, and the domain cannot import provider or server code.

## Determination-language boundary

`src/domain/determination/determination-language.ts` owns schema version `1`, localized section limits, language-neutral grounding codes, and the command derived from a matching filing and assessment. The command fixes the disposition and remedy authority before any provider call. It includes the bounded witness statement but excludes the respondent alias and exact clock time.

`src/domain/determination/locales/en.ts` owns English editorial policy version `1`, prompt guidance, vocabulary anchors, runtime editorial validation, and complete compositional fallback. The fallback and provider output share one shape. Validation is local and deterministic: exact schema, locale, disposition, grounding, length, supported numbers, factual anchors, safety, tone, and remedy compliance all precede acceptance.

`src/providers/openai-determination-language.ts` implements the first owned adapter with the OpenAI Responses API and strict Structured Outputs. The configurable default model is `gpt-5.6-luna` with low reasoning effort. Provider response storage is disabled, output is bounded, the SDK timeout is 12 seconds, and SDK retries are disabled so the product owns its retry budget. Provider errors and refusals become categorical results without raw text.

`src/server/determination/generate-determination-language.ts` permits at most two attempts. Invalid output and transient failures may use the second attempt; refusal and terminal configuration or request failures immediately select fallback. Every valid command therefore completes with provider or fallback language, while a mismatched filing and assessment is rejected before the provider boundary.

The filing action invokes this seam after runtime validation and deterministic assessment. Source and fallback reason remain internal; both successful paths return the same validated language shape to the determination experience.

## Determination experience boundary

`src/server/determination/complete-filing-review.ts` composes validation, assessment, language generation, and transient issuance behind a dependency-injected service. The Next.js action supplies the configured provider, server time, and cryptographic random reference material. Unexpected internal failure becomes a typed terminal outcome without raw details.

The localized `/{locale}/determination` route is a client-restored private result, not a public record. Its versioned session envelope contains the reviewed draft and issued determination for 30 minutes in the current tab. Restoration validates the draft, recomputes the complete assessment, revalidates English language against the resulting command, and rejects altered identity, facts, assessment, or prose. Missing or invalid state returns to review with localized guidance; the longer-lived safe draft remains under the filing lifecycle.

The procedural reference is random and non-sensitive but explicitly transient. Its year and six-character suffix combine with the assessment visual seed only for curated presentation variation. The responsive record includes a semantic text equivalent for the visual timeline, uses locale-aware date, time, and number formatting, exposes no provider diagnostics, and is marked `noindex`. Loading exists only during real work, terminal failure preserves review and retry, and reduced motion collapses the single reveal.

Later capabilities still own credits and access authorization.

## Persistent public-record boundary

`src/domain/public-record` owns language-neutral identifier grammars, lifecycle states, report reasons, consultation positions and aggregate rules, availability, and owner-transition rules. The server revalidates the complete normalized filing, deterministic assessment, localized language, procedural identity, and presentation variant before a transient snapshot may cross into persistence. Publication is rejected after the 30-minute transient lifetime.

`src/server/public-record` owns repository contracts, cryptographic digests, atomic publication, idempotent replay, owner authorization, report recording, migrations, and failure normalization. Public identifiers use 128 random bits. Owner credentials use 256 random bits, travel only through client-private state or a URL fragment, and are retained only as SHA-256 digests. Constant-time comparison precedes every owner mutation.

PostgreSQL owns relational identity, status, expiry, report metadata, consultation responses, and unique idempotency constraints; a versioned JSONB value owns the immutable validated determination snapshot. The portable production adapter uses a server-only `DATABASE_URL`, with Supabase as the initial managed target and prepared statements disabled for transaction-pooler compatibility. PGlite provides a repository-compatible embedded PostgreSQL runtime for local development and deterministic integration and browser tests.

The localized `/{locale}/record/{publicId}` route renders only published, unexpired snapshots. The document is rendered on the server; its small interactive reporting island receives only the public identifier and localized interface copy, so non-rendered snapshot fields are not serialized into the public client payload. The separate `/manage` route receives an owner credential from the URL fragment, immediately removes it from browser history, retains it only in tab storage, and sends it only in protected server actions. Published routes and owner routes use dynamic rendering, `noindex`, `nofollow`, and `no-store`; unavailable results use one non-enumerating 404 presentation.

Publication, status change, hard deletion with report and consultation cascades, categorical reporting, report resolution, and Bureau unpublishing are explicit database operations. A failed publication preserves the transient result and cannot expose a partial record. Reports contain record identity, a categorical reason, lifecycle status, and timestamps only; the operator command never prints the determination snapshot.

## Sharing boundary

`src/domain/public-record/public-record-sharing.ts` derives a versioned share descriptor from an available public record. Its explicit allowlist contains department, disposition, procedural reference, offence, discrepancy minutes, mitigation, and presentation variant only. Feature-owned locale copy turns those language-neutral values into visible preview, share payload, metadata, and accessible image text without admitting aliases, witness prose, exact times, relationship or impact context, generated determination sections, public identifiers as copy, or owner credentials.

The public route builds its canonical address only from a validated server-side `BUREAU_PUBLIC_ORIGIN`. HTTPS is required except for configured loopback development and test servers. Production with missing or invalid origin configuration uses the same non-enumerating unavailable state; request headers do not become canonical authority.

The available page exposes a small client sharing island. It attempts the native Web Share API, preserves user cancellation, falls back to the Clipboard API after unsupported or failed sharing, and focuses a read-only selectable public address after clipboard failure. The island receives one canonical public URL and bounded localized share copy; no owner credential or non-preview snapshot field is serialized to it.

The localized social-image route renders a deterministic 1200 by 630 PNG from code. Its URL includes `updatedAt` as a lifecycle revision, and the handler verifies both current publication availability and the exact revision before rendering. The public page, metadata, and image are dynamic and `no-store`; unavailable metadata is generic and unavailable image requests return no asset. A process-global runtime repository promise ensures server actions, page metadata, public rendering, and image rendering share one embedded PGlite connection during local and browser verification. Production PostgreSQL remains the cross-process persistence authority.

## Public-consultation boundary

`src/domain/public-record/public-consultation.ts` owns the three language-neutral positions, aggregate shape, key grammar, count mapping, and bounded percentage calculation. Localized position labels, pluralized counts, advisory copy, empty and failure states, and browser interaction remain in the public-record feature.

The browser creates a random 256-bit key scoped to one record and stores a versioned envelope containing that key, the selected position, and whether submission completed. Only the digest crosses persistence. This state restores ordinary same-browser participation after refresh without creating a cross-record identity; database uniqueness, rather than client state, remains authoritative. Clearing storage can bypass the boundary and no stronger claim is made.

The repository inserts a response only by selecting a currently published, unexpired parent record. A unique `(public_id, participation_digest)` constraint makes retries idempotent and positions immutable. The insert and subsequent count query share one PostgreSQL transaction; aggregates are derived from response rows rather than mutable counters. Aggregate reads use the same lifecycle predicate. Unpublishing and expiry preserve rows but expose no results, owner restoration reuses them, and record deletion cascades to them.

The public page server-renders the current aggregate, then a small localized client island owns submission, local recovery, live feedback, and the restrained result transition. It receives no owner authority and sends no aliases, witness prose, generated determination language, or other raw case content. Consultation cannot write to the determination snapshot and consumes no model call or filing credit.

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

The implemented language stage targets one paid request and permits one additional attempt only for a transient failure or rejected output. Cost optimization must not reduce output quality; strict validation, curated fixtures, fallback, and later budget controls protect the product instead.

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

- deployment provider;
- analytics provider;
- production model promotion and routing beyond the configurable `gpt-5.6-luna` default;
- detailed rate-limit implementation.

These decisions require rendered product evidence, provider evaluation, or explicit human approval.
