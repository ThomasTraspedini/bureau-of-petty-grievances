# Architecture constraints

## Status

The first complete interaction direction remains rendered as a repository-native prototype. The production application uses the accepted Next.js foundation and now connects department-aware filing, deterministic assessment, locale-aware language, transient issuance, persistent public records, sharing, public consultation, evaluation cost control, transferable standard access, and privacy-preserving product analytics described in the relevant [decision records](decisions/README.md). The prototype remains evidence; production capabilities enter through explicit application, localization, domain, server, provider, access, persistence, and observability boundaries.

## Application foundation

The production shell uses Next.js 16 App Router, React, strict TypeScript, and `next-intl` on the Node.js 24 LTS line. npm owns the reproducible lockfile. Native CSS preserves the approved visual system, while `next/font/local` bundles the repository's Public Sans, Source Serif 4, and IBM Plex Mono files without an external font request.

`/en`, `/it`, `/fr`, `/de`, `/es`, and `/pt-BR` are the enabled application routes. The root redirects to English, unsupported paths resolve to a localized unavailable state, and the route locale controls the document language, catalog, metadata, and navigation. Catalog types are derived from the English reference catalog; recursive tests require every supported catalog to preserve the same keys and placeholders. A request-scoped catalog seam can apply proportional pseudo-localization only when both the dedicated E2E server setting and test header are present; ordinary development and production requests cannot expose that catalog as a public locale or persist it as generated-content language.

Browser-engine support and its physical-device limits are defined in [testing](testing.md#browser-and-visual-contracts); they are not a universal device-support claim.

Current source ownership is deliberately small:

- `src/app` adapts routes and framework rendering;
- `src/features` owns vertical user-facing application surfaces;
- `src/i18n` owns locale validation, catalogs, navigation, and test-only pseudo-localization support;
- `src/domain` owns deterministic filing and assessment policy and remains independent of React, Next.js, server, and provider imports;
- `src/providers` translates owned language commands into external requests and may not import application routes or feature views;
- `src/server` orchestrates bounded provider attempts, validation, fallback, and the owned persistence repository without moving provider or database concerns into domain policy.

## Adaptive filing boundary

The production filing journey lives at validated `/{locale}/file/{step}` routes and explicitly selects an enabled department before its adaptive fact step. Route codes and stored domain values are language-neutral; localized catalogs provide all visible labels, instructions, errors, accessibility text, and review summaries.

`src/domain/filing` owns a department-discriminated draft boundary with three fact variants per enabled department, normalization, structural limits, and conservative harmless-content boundaries. Digital facts are bounded aggregate counts and intervals with no message or account integration. Domestic facts are bounded quantities, correction distance and effort, or 30-day recurrence supplied by the filer; the application accepts no photos, sensors, home maps, room names, or surveillance. Social facts are bounded option, decision, participant, revision, and notice measures supplied by the filer; the application accepts no calendars, messages, contacts, locations, invitations, guest lists, attendance records, or social-network data. The filing feature owns route progress, responsive controls, review presentation, and a versioned device-local storage envelope. Stored drafts carry their locale and update time, expire after 30 days, and are runtime-validated before entering application state. Version-1 through version-3 envelopes migrate to version `4`; rejected witness text is excluded from storage while the rest of a safe draft remains recoverable. Successful completion adds a separate locale-bound, content-free completion marker with the same lifetime. A still-valid pre-marker determination is accepted as migration evidence only when its fully revalidated filing exactly matches the stored draft. The review route preserves the completed draft; an external entry to the opening step consumes the completion evidence and clears the completed draft and transient determination before starting blank. Any correction clears the marker and returns the filing to the ordinary recoverable in-progress lifecycle.

The reviewed filing crosses a server action and is validated again through the same domain boundary. Invalid input returns typed rejection. Accepted input continues through deterministic assessment, paid-access authorization or deterministic continuity, and locale-aware language orchestration before returning a complete transient determination. The action stores no filing content, creates no public identifier, and claims no external investigation; persistence requires a separate informed publication action.

## Deterministic assessment boundary

`src/domain/determination` dispatches a validated filing to an owned department policy. Chronology policy version `1` normalizes its fact variants into a comparable discrepancy. Digital Conduct policy version `1` evaluates message-to-idea density, voice-note duration, or an ordinary response interval. Domestic Affairs policy version `1` evaluates a container remainder ratio, object quantity and correction path, or empty-package quantity and recurrence. Social Planning policy version `1` evaluates option and rejection counts, decision rounds and elapsed hours, or confirmed-plan revisions and notice. All apply inspectable severity thresholds and a single capped consequence adjustment, record mitigation without allowing it to erase facts, and return offence- and relationship-aware remedy constraints.

The same output carries bounded presentation parameters and a stable four-way visual variant. Chronology supplies a timeline; Digital Conduct supplies a communications docket; Domestic Affairs supplies a property register rendered as a container gauge, correction path, or inventory markers; Social Planning supplies a decision register rendered as an option tree, deliberation history, or revision-impact record. Each is built only from the department's approved structured facts. The seed is derived only from language-neutral assessment inputs approved for variation; aliases, witness prose, relationship context, exact clock times, room names, and communication content cannot influence it. The assessment includes no localized prose and imports no framework, persistence, or provider code.

Any rule change that can alter assessment output requires a new policy version. Language generation and fallback consume this owned contract rather than reinterpret raw filing fields or invent remedy authority.

ESLint enforces the domain and provider import direction. The provider adapter cannot import routes or feature views, and the domain cannot import provider or server code.

## Determination-language boundary

`src/domain/determination/determination-language.ts` owns schema version `1`, localized section limits, language-neutral grounding codes, and the command derived from a matching filing and assessment. The command fixes the disposition and remedy authority before any provider call. It includes the bounded witness statement but excludes the respondent alias and exact clock time.

Each locale/department policy owns its version, prompt guidance, vocabulary anchors, runtime editorial validation, and complete compositional fallback for `en`, `it`, `fr`, `de`, `es`, and `pt-BR`. The locale policies use locally appropriate formal registers while preserving the same calm, precise, sincere Bureau voice. The fallback and provider output share one shape. Validation is local and deterministic: exact schema, locale, disposition, grounding, length, supported numbers, factual anchors, safety, tone, and remedy compliance all precede acceptance. Digital Conduct policy additionally rejects fabricated observation, monitoring, compelled availability, urgency assumptions, and binding response demands. Domestic Affairs rejects household surveillance, external verification, binding control, hygiene or food enforcement, property disposal, financial penalties, and serious safety, access, care, health, or work-duty matters. Social Planning rejects calendar, message, contact, location, attendance, invitation, guest-list, and social-network access; compelled attendance or contact; exclusion; and adjudication of serious obligations or interpersonal harm.

`src/providers/openai-determination-language.ts` implements the first owned adapter with the OpenAI Responses API and strict Structured Outputs. The configurable default model is `gpt-5.6-terra` with low reasoning effort. The provider returns prose only; the adapter deterministically attaches locale, disposition, and grounding before locale validation. Provider response storage is disabled, output is bounded, the SDK timeout is 18 seconds, and SDK retries are disabled so the product owns its retry budget. Provider errors and refusals become categorical results without raw text.

`src/server/determination/generate-determination-language.ts` permits at most two attempts. Invalid output and transient failures may use the second attempt; refusal and terminal configuration or request failures immediately select fallback. Every valid command therefore completes with provider or fallback language, while a mismatched filing and assessment is rejected before the provider boundary.

The filing action invokes this seam after runtime validation and deterministic assessment. A metered provider wrapper must reserve a durable global attempt immediately before each external call; direct configured-provider invocation is not a production path. Both successful paths return the same validated language shape. The evaluation-only transient comparison is the narrow source-opacity exception in [decision 0023](decisions/0023-personalized-determination-language.md); it is never persisted or published with the determination.

## Determination experience boundary

`src/server/determination/complete-filing-review.ts` composes validation, assessment, language generation, and transient issuance behind a dependency-injected service. The Next.js action supplies the configured provider, server time, and cryptographic random reference material. Unexpected internal failure becomes a typed terminal outcome without raw details.

The localized `/{locale}/determination` route is a client-restored private result, not a public record. Its department-aware version-4 session envelope contains the reviewed draft, explicit locale, and issued determination for 30 minutes in the current tab and accepts validated version-1 through version-3 sessions during migration. Restoration validates the draft, recomputes the complete department assessment, revalidates language through the matching locale policy, and rejects altered locale, identity, facts, assessment, or prose. Missing or invalid state returns to review with localized guidance; the longer-lived safe draft remains under the filing lifecycle.

The procedural reference is random and non-sensitive but explicitly transient. Department prefixes (`CHR`, `DIG`, `DOM`, and `SOC`), its year, and six-character suffix combine with the assessment visual seed only for curated presentation variation. The responsive record includes a semantic text equivalent for its visual evidence grammar, uses locale-aware date, time, and number formatting, exposes no provider diagnostics, and is marked `noindex`. Loading exists only during real work, terminal failure preserves review and retry, and reduced motion collapses the single reveal.

Evaluator and standard access are resolved before optional provider language. Both use the same metered provider boundary while retaining distinct entitlement behavior.

## Evaluation-access and cost-control boundary

`src/domain/access` owns credential grammars, lifetimes, rate defaults, global defaults, and alert-threshold calculation without importing framework, database, or provider code. `src/server/access` owns cryptographic digesting, daily network pseudonyms, evaluator-link exchange, opaque sessions, repository contracts, SQL transactions, and the metered provider seam.

An evaluator URL carries a random 256-bit `eva_` credential in its fragment. The localized client removes that fragment before a server action receives the credential. Persistence retains only its SHA-256 digest. Exchange creates a distinct random `evs_` credential in an `HttpOnly`, `SameSite=Lax` cookie and stores only that credential's digest. Grant expiry caps session expiry; revocation invalidates all attached sessions through the grant join.

A browser-held random `fil_` key scopes one logical request to one evaluator session. PostgreSQL locks the session and grant, applies session, grant, and network buckets, reserves one credit, and inserts a unique request containing only a filing digest, procedural reference, categorical state, attempt count, and timestamps. Exact concurrent requests cannot create another reservation. Active duplicates wait for the short lease; expired ambiguous work becomes fallback and refunds the logical credit without redispatch.

The global singleton control row owns the provider kill switch, attempt limit, and dispatched count. Each permitted provider attempt increments that count transactionally before the adapter runs, and the unit is never refunded. Valid provider language moves one reserved evaluator credit to consumed; fallback and terminal internal failure release it. Missing access, exhausted controls, invalid lifecycle, and database unavailability substitute the configured provider with the existing complete fallback provider.

Daily HMAC network digests support coarse limits without retaining raw addresses. Production paid access requires a secret of at least 32 characters and an explicit trusted-proxy hop count; the application origin must not be directly reachable around that trusted proxy. Durable categorical alerts are inserted on the exact 75, 90, and 100 percent crossings for each evaluator pool and the global budget. Operator commands can deliver them to an optional HTTPS webhook and contain no case content.

## Standard-access and successor-transfer boundary

`src/domain/access/standard-access.ts` owns the initial five-credit limit, authorization, entitlement and invitation lifetimes, identifier grammars, and language-neutral private status shape. The localized `/{locale}/access` client removes either a `std_` initial credential or `sti_` successor credential before exchange. The server returns a separate digest-backed `sts_` session cookie capped by the one fixed entitlement expiry.

PostgreSQL separates one-use initial authorizations, the non-copyable credit entitlement, exclusive holder tenures, browser sessions, successor invitations, and standard generation requests. Provider completion updates the entitlement counter and the current tenure's qualification in one transaction. Fallback releases the reservation without qualification. Generation rate limits and global attempt reservation are shared with evaluation access, while no standard pool creates per-entitlement operational alerts.

Successor issuance requires one provider completion during the current tenure, a positive residual balance, and no active generation reservation. It moves that tenure to `transfer_pending`; paid generation then selects fallback without touching the reserved balance. One partial unique index prevents multiple active invitations, and one partial unique tenure index prevents simultaneous holders. Claim locks invitation, tenure, and entitlement, marks the former tenure transferred, and creates a new tenure over the same counters. Cancellation, replacement, and lazy expiry recovery are explicit transitions. The entitlement's 180-day expiry is never extended.

The raw invitation exists only in the action response and tab-scoped client storage for copying. Reload can recover it within that tab; otherwise the holder replaces it, atomically invalidating the lost token. Public record and sharing components receive neither access status nor credentials. A separate singleton switch disables new invitation issuance without changing generation or deterministic service continuity.

## Persistent public-record boundary

`src/domain/public-record` owns language-neutral identifier grammars, lifecycle states, report reasons, consultation positions and aggregate rules, availability, and owner-transition rules. The server revalidates the complete normalized filing, deterministic assessment, localized language, procedural identity, and presentation variant before a transient snapshot may cross into persistence. Publication is rejected after the 30-minute transient lifetime.

`src/server/public-record` owns repository contracts, cryptographic digests, atomic publication, idempotent replay, owner authorization, report recording, migrations, and failure normalization. Public identifiers use 128 random bits. Owner credentials use 256 random bits, travel only through client-private state or a URL fragment, and are retained only as SHA-256 digests. Constant-time comparison precedes every owner mutation.

PostgreSQL owns relational public-record identity, evaluation and standard access grants, exclusive tenures, opaque sessions, successor transitions, generation accounting, rate buckets, alert metadata, lifecycle, report metadata, consultation responses, and unique idempotency constraints; a versioned JSONB value owns only the immutable validated public determination snapshot. The portable production adapter uses a server-only `DATABASE_URL`, with Neon Free as the approved production target and prepared statements disabled for transaction-pooler compatibility. PGlite provides a repository-compatible embedded PostgreSQL runtime for local development and deterministic integration and browser tests.

The localized `/{locale}/record/{publicId}` route renders only published, unexpired snapshots. The document is rendered on the server; its small interactive reporting island receives only the public identifier and localized interface copy, so non-rendered snapshot fields are not serialized into the public client payload. The separate `/manage` route receives an owner credential from the URL fragment, immediately removes it from browser history, retains it only in tab storage, and sends it only in protected server actions. Published routes and owner routes use dynamic rendering, `noindex`, `nofollow`, and `no-store`; unavailable results use one non-enumerating 404 presentation.

Publication, status change, hard deletion with report and consultation cascades, categorical reporting, report resolution, and Bureau unpublishing are explicit database operations. A failed publication preserves the transient result and cannot expose a partial record. Reports contain record identity, a categorical reason, lifecycle status, and timestamps only; the operator command never prints the determination snapshot.

## Sharing boundary

`src/domain/public-record/public-record-sharing.ts` derives a versioned share descriptor from an available public record. Its department-specific allowlist contains identity, disposition, procedural reference, offence, approved preview evidence, mitigation, and presentation variant only. Domestic previews may expose container serving counts, object count and correction distance, or empty-package count and recurrence; they exclude correction seconds. Social previews may expose proposed and rejected option counts, decision rounds with elapsed hours and participant count, or revision count with participant count and notice hours; they exclude alternatives offered. Feature-owned locale copy turns those language-neutral values into visible preview, share payload, metadata, and accessible image text without admitting aliases, witness prose, exact times, relationship or impact context, generated determination sections, public identifiers as copy, or owner credentials. The descriptor is version `4`.

The public route builds its canonical address only from a validated server-side `BUREAU_PUBLIC_ORIGIN`. HTTPS is required except for configured loopback development and test servers. Production with missing or invalid origin configuration uses the same non-enumerating unavailable state; request headers do not become canonical authority.

The available page exposes a small client sharing island. It attempts the native Web Share API, preserves user cancellation, falls back to the Clipboard API after unsupported or failed sharing, and focuses a read-only selectable public address after clipboard failure. The island receives one canonical public URL and bounded localized share copy; no owner credential or non-preview snapshot field is serialized to it.

The localized social-image route renders a deterministic 1200 by 630 PNG from code. Its URL includes `updatedAt` as a lifecycle revision, and the handler verifies both current publication availability and the exact revision before rendering. The public page, metadata, and image are dynamic and `no-store`; unavailable metadata is generic and unavailable image requests return no asset. A process-global runtime repository promise ensures server actions, page metadata, public rendering, and image rendering share one embedded PGlite connection during local and browser verification. Production PostgreSQL remains the cross-process persistence authority.

## Public-consultation boundary

`src/domain/public-record/public-consultation.ts` owns the three language-neutral positions, aggregate shape, key grammar, count mapping, and bounded percentage calculation. Localized position labels, pluralized counts, advisory copy, empty and failure states, and browser interaction remain in the public-record feature.

The browser creates a random 256-bit key scoped to one record and stores a versioned envelope containing that key, the selected position, and whether submission completed. Only the digest crosses persistence. This state restores ordinary same-browser participation after refresh without creating a cross-record identity; database uniqueness, rather than client state, remains authoritative. Clearing storage can bypass the boundary and no stronger claim is made.

The repository inserts a response only by selecting a currently published, unexpired parent record. A unique `(public_id, participation_digest)` constraint makes retries idempotent and positions immutable. The insert and subsequent count query share one PostgreSQL transaction; aggregates are derived from response rows rather than mutable counters. Aggregate reads use the same lifecycle predicate. Unpublishing and expiry preserve rows but expose no results, owner restoration reuses them, and record deletion cascades to them.

The public page server-renders the current aggregate, then a small localized client island owns submission, local recovery, live feedback, and the restrained result transition. It receives no owner authority and sends no aliases, witness prose, generated determination language, or other raw case content. Consultation cannot write to the determination snapshot and consumes no model call or filing credit. Its existing per-record browser key remains the proportionate repeat-response boundary; the C10 network limiter protects paid generation and evaluator exchange rather than turning public opinion into invasive identity.

## Product-analytics boundary

`src/domain/observability` owns analytics schema version `4`, identifier grammars, exact event-specific property validation, retention policy, and the stable analysis catalog. The schema includes the department-specific fact steps and categorical path codes for all enabled departments while retaining an exact allowlist. It has no open metadata field and admits only language-neutral product codes, categorical outcomes, bounded operational measurements, release metadata, and purpose-specific pseudonyms. It cannot represent filing answers—including communication, household, or social-planning measures—user-supplied prose, locations, room names, credentials, raw record identifiers, URLs, referrers, or network addresses.

The browser holds one random `jrn_` identifier in tab-scoped `sessionStorage`. Explicit feature instrumentation posts small JSON envelopes to `/api/observability`; the route accepts only same-origin current events under four kilobytes and revalidates the complete contract. The localized layout resolves enablement at request time so deployment configuration and disclosure cannot be frozen into a build artifact. No provider token, browser SDK, analytics cookie, autocapture, replay, or heatmap enters the client boundary.

`src/server/observability` owns explicit environment validation, event enrichment, HMAC pseudonymization, release and pricing metadata, token-based cost estimation, and failure isolation. Public-record and successor-invitation source values receive different HMAC purposes and are never delivered in clear text. The application stores no persistent analytics copy.

`src/providers/mixpanel-product-analytics.ts` is the first replaceable adapter. It sends current events to the configured EU or US Mixpanel ingestion host with `ip=0`, a 750-millisecond timeout, event idempotency, and a server-only project token. Any invalid configuration disables the runtime; rejection, timeout, or provider failure is swallowed outside the product transaction. Mixpanel-side 180-day retention, disabled geolocation enrichment, and disabled automatic capture remain explicit deployment checks.

## Prototype evidence

The [retained prototype](../prototype/README.md) preserves the accepted interaction direction. Its static modules, state, storage and URLs are evidence rather than production architecture.

## Cross-cutting constraints

Runtime-validate external input at routes, configuration, persistence, provider and analytics boundaries. Keep deterministic domain policy independent of frameworks, databases and providers; normalize integration errors before they reach product behavior.

Locale is explicit. Issued snapshots retain their content locale and policy identity; changing interface locale never translates an existing determination. Enabling another locale requires its own catalog, fallback, editorial/safety evaluation and layout evidence.

Generation credits and consultation rely on database transactions and idempotency, not browser state. Public identifiers, private access credentials and visual seeds have separate purposes; seeds must not encode personal content or grant access.

Public-record expiry removes access without implicit destruction. The implemented owner/Bureau transitions and deletion behavior are the lifecycle contract; archival, export or automatic purge require an explicit later decision. See [product](product.md) and [operations](operations.md).

## Decisions intentionally deferred

- deployment provider;
- production model promotion and routing beyond the configurable `gpt-5.6-terra` default;
- experimentation, warehouse export, qualitative-feedback capture, and analytics beyond the accepted explicit event contract;
- account-backed access, payment, entitlement replenishment, and cross-device standard-session recovery;
- hosting-specific proxy topology, scheduled alert delivery, and broader public-mutation abuse controls.

These decisions require rendered product evidence, provider evaluation, or explicit human approval.
