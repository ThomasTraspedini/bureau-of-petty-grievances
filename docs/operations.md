# Operations and release expectations

## Operating window

The product is designed to support a focused public evaluation without assuming production-scale operation. Its architecture should nevertheless permit continued iteration rather than embedding an automatic shutdown or destructive expiry.

## Deployment goals

- A stable browser URL with no evaluator setup.
- Mobile-first delivery and reliable desktop rendering.
- Preview environments that do not leak credentials or private records.
- A small number of managed services and a reproducible deployment path.
- Hosting and persistence costs near zero at evaluation scale.
- Generative spend bounded independently of expected traffic.

The application foundation produces a full Node.js server build on Node.js 24. This preserves the framework capabilities required for protected server actions and dynamic public records. The hosting provider remains deferred until preview isolation, cost, and operational needs can be evaluated together. Persistent records use portable PostgreSQL, with Supabase selected as the initial managed target; the application remains independent of Supabase authentication and SDKs.

A deployed instance must set `BUREAU_PUBLIC_ORIGIN` to its bare public HTTPS origin. This non-secret setting is the sole authority for canonical record links, share payloads, and social-image addresses; forwarded request headers are intentionally ignored. Missing or invalid production configuration makes public records unavailable without exposing internal configuration details. Development and test use an explicit loopback origin.

The rendered application has no required secrets because provider absence selects the complete deterministic fallback. When configured, the filing server action invokes the adapter using `OPENAI_API_KEY` and a configurable `BUREAU_OPENAI_MODEL` whose default is `gpt-5.6-luna`; credentials remain in ignored local or deployment configuration. Production font files are bundled locally. CI and local verification explicitly provide no provider credential, make no provider calls, and use the same repository command after installing dependencies and the Playwright Chromium browser.

The production filing sends a reviewed draft to the server for runtime validation, deterministic assessment, authorized language realization, and transient determination issuance. It does not automatically store filing content or produce a public record. A valid evaluator or standard session may reserve one provider-generation credit; anonymous and unavailable paid paths use deterministic language without a reservation. The safe draft remains in a locale-bearing, versioned browser envelope for no longer than 30 days and can be reset explicitly. The issued result uses a separate validated tab-scoped envelope with a 30-minute lifetime. Content rejected as serious, sensitive, or unnecessarily identifying is not retained in either accepted path.

During that transient lifetime, a filer may explicitly publish the displayed snapshot. Production requires a server-only pooled PostgreSQL `DATABASE_URL`; no database key enters a browser bundle. The server disables prepared statements for transaction-pooler compatibility and idempotently applies shared schema version `4` when the database runtime starts. For local development, `BUREAU_EMBEDDED_DATABASE_PATH=.data/public-records` selects an ignored durable PGlite directory instead. `DATABASE_URL` takes precedence when both are present.

Publication revalidates the complete snapshot, then atomically inserts it with its public identity, idempotency key, hashed owner credential, status, issue and publication times, and 180-day expiry. A database failure returns localized recovery copy while the transient determination remains available. Neither a partial record nor raw database error reaches the filer.

Public consultation adds one response row containing the public record identity, a SHA-256 participation-key digest, one position code, and a timestamp. It stores no account, IP address, device fingerprint, free text, or case-content copy. Counts are derived transactionally from these rows. Temporary unpublishing and expiry stop reads and writes without erasing aggregates; owner restoration returns them, and hard record deletion cascades to them. Clearing browser storage can bypass the per-record participation key, so this mechanism is proportionate repeat resistance rather than a claim of person-level uniqueness. The access-control network limiter protects paid generation and link exchange; consultation deliberately retains its proportionate per-record browser boundary.

The language seam sends a matching assessment command to the OpenAI Responses API only when deliberately invoked with configuration. Requests disable response storage, exclude the respondent alias and exact clock time, bound output, use a 12-second SDK timeout, and disable SDK retries. The product owns at most one retry and converts provider responses, refusals, and failures into typed outcomes. Raw provider errors and invalid text are discarded; a complete locale-owned fallback remains available for every valid Chronology command.

## Cost controls

The quality bar determines the generative approach. Budget controls prevent runaway spend instead of encouraging deliberately weak output.

Implemented controls include:

- server-side authorization for every paid action;
- bounded input and output size;
- explicit retry limits;
- atomic credit reservation and refund;
- per-session and coarse abuse limits;
- a hard application-level global generation budget;
- provider-level budget alerts or limits where available;
- an immediate generation kill switch;
- a localized deterministic fallback;
- usage telemetry that excludes personal case content.

### Evaluation access

Create a 30-day evaluator grant only after the database schema has been initialized:

```sh
npm run access:operate -- create
```

`BUREAU_PUBLIC_ORIGIN` supplies the trusted HTTPS origin. The command prints the complete fragment-bearing link once and stores only its digest. Forward that link through an appropriate private channel. Opening it removes the fragment before exchange and creates a separate `HttpOnly`, `SameSite=Lax` cookie for at most 14 days. Revoking the parent grant immediately invalidates its sessions.

Inspect and maintain grants without printing bearer credentials:

```sh
npm run access:operate -- status
npm run access:operate -- top-up egr_0123456789abcdefghijkl 25
npm run access:operate -- extend egr_0123456789abcdefghijkl 14
npm run access:operate -- revoke egr_0123456789abcdefghijkl
```

Each new grant begins with 100 logical credits. A filing reserves one atomically and consumes it only for validated provider language. Fallback and terminal internal failure refund it. Request records retain the session-scoped idempotency key, SHA-256 filing digest, procedural reference, categorical outcome, provider-attempt count, and timestamps for recovery; they retain no raw filing field, prompt, provider response, or determination prose. A cleanup policy may remove expired operational rows after the evaluation window, but correctness never depends on deletion.

### Standard access and successor transfer

Create one initial standard authorization with the same configured public origin and database used by the application:

```sh
npm run access:operate -- standard-create
```

The command prints one 30-day `std_` fragment link once. Later status output contains categorical authorization and entitlement counts only. An unused initial authorization can be revoked by identifier:

```sh
npm run access:operate -- standard-revoke sau_0123456789abcdefghijkl
```

Claim creates one anonymous 180-day entitlement with five provider-generation credits. The expiry is fixed from initial claim and never extends on transfer. Validated provider language consumes a credit; fallback and terminal internal failure refund it. Only a provider-backed completion during the current tenure qualifies that holder to transfer a positive residual balance.

Issuing an invitation freezes paid generation for that holder and creates one digest-only `sti_` fragment credential, valid for at most 30 days and never beyond the entitlement. Cancel or expiry restores the holder. Replacement invalidates the previous link. Claim atomically revokes the former paid tenure and creates one successor tenure over the same residual counters. Operators can suspend or restore new invitations without disabling filing or deterministic fallback:

```sh
npm run access:operate -- invitations disable
npm run access:operate -- invitations enable
```

There is no standard top-up command: this release intentionally cannot mint credits into an active transfer chain. A lost claimed browser session is unrecoverable without future account infrastructure. An unclaimed invitation remains recoverable by cancellation or replacement from its current holder.

### Limits, budget, and kill switch

Paid generation starts are limited to three per minute per session, 20 per minute per daily network pseudonym, and 30 per minute per evaluator grant. Link exchange uses the network and grant boundaries. Production must set a random `BUREAU_NETWORK_HMAC_SECRET` of at least 32 characters and `BUREAU_TRUSTED_PROXY_HOPS` to the number of trusted proxy-appended addresses skipped from the right of `X-Forwarded-For`. The application origin must reject direct traffic that bypasses this proxy. Raw addresses are never written.

The global budget begins at 200 provider dispatches. Each allowed call increments it immediately before the external request and is never refunded, even when the call fails. Add capacity or disable generation without a redeploy:

```sh
npm run access:operate -- budget-add 50
npm run access:operate -- generation disable
npm run access:operate -- generation enable
```

Disabling generation, exhausting a grant, or exhausting the global budget routes valid filings through the same official deterministic fallback. Rate limiting is different: it pauses the repeated request, preserves the filing and stable browser idempotency key, and returns localized retry guidance. The provider account should also have an independent spending limit or alert configured before public evaluation; application counters do not replace provider controls.

### Usage alerts

Crossing 75, 90, or 100 percent of an evaluator pool or the global budget inserts one durable categorical alert. Inspect or acknowledge alerts with:

```sh
npm run access:operate -- alerts
npm run access:operate -- alert-acknowledge 1
```

Optional delivery uses `BUREAU_ALERT_WEBHOOK_URL` with an HTTPS endpoint and, when configured, `BUREAU_ALERT_WEBHOOK_SECRET` as a bearer value:

```sh
npm run access:operate -- alerts-deliver
```

Delivery is operator-invoked until a hosting scheduler is selected. Failed deliveries remain pending. Payloads contain only alert scope, grant or global identifier, threshold, integer usage, limit, and creation time.

## Observability

Product analytics is disabled by default and is not required for any user journey. An enabled deployment requires every analytics setting in `.env.example`: a Mixpanel project token, matching EU or US region, separate HMAC secret, the fixed 180-day retention assertion, semantic application version, pricing version, and integer input/output prices in micro-US-dollars per million tokens. Verify the effective categorical state without printing secrets:

```sh
npm run analytics:operate -- status
```

The application records explicit events for entry, filing steps and paths, validation, determination outcome and latency, provider attempts and estimated cost, publication, sharing, public views, consultation, reporting, access redemption, successor handoff, and owner lifecycle operations. Operational signals distinguish:

- validation and safety rejection;
- provider failure or malformed output;
- persistence and transaction failure;
- exhausted entitlement or global budget;
- rate limiting;
- client rendering and sharing failure.

Browser events use a random tab-scoped journey identifier and a bounded same-origin collector. Public records and successor invitations use purpose-separated HMAC pseudonyms. Mixpanel delivery occurs server-side, uses the selected regional host with `ip=0`, and cannot block product work. The application retains no analytics event copy.

Before enabling production collection, configure Mixpanel retention to 180 days, keep geolocation enrichment, autocapture, and session replay disabled, restrict project access, verify the localized disclosure, and confirm that blocking Mixpanel leaves the complete journey usable. Release comparisons must filter to `environment=production` and preserve `application_version` and `pricing_version`. The authoritative event catalog, report definitions, data-quality checks, interpretation limits, and incident procedure are in [product analytics](analytics.md).

Logs and analytics must use categorical metadata or approved purpose-specific pseudonyms, never bearer credentials, raw record or invitation identifiers, raw network addresses, respondent names, filing answers, witness statements, prompts containing personal text, full URLs or referrers, or generated determinations.

## Data and privacy operations

- Public records are unlisted and `noindex` by default.
- Reporting and owner-controlled unpublishing must be operational, not decorative.
- Deletion must remove or irreversibly detach public access and associated private content.
- Lifecycle and retention remain configurable.
- Social previews use revisioned, lifecycle-checked, `no-store` image URLs so application-controlled caches cannot preserve an available preview after unpublishing.
- Backups, exports, and provider retention must be understood before public evaluation.
- Provider data controls and retention must be reviewed before configuring a provider in a public deployment; `store: false` is necessary but not the whole deployment privacy review. A deployment can remain fully usable through deterministic fallback while that review is pending.

Public record pages and management pages are always dynamic, `noindex`, `nofollow`, and `no-store`. The public identifier grants read access only. Owner authority uses a separate recovery-link fragment and a 256-bit credential whose SHA-256 digest is compared in constant time; losing that private link is intentionally unrecoverable without a future account system.

Record metadata and social images contain only bounded non-identifying structured facts. Fresh requests stop returning record-specific metadata or imagery immediately after unpublishing, expiry, Bureau action, or deletion, and restoration creates a new revisioned image address. A third-party crawler may retain an earlier response despite `no-store`; no web application can universally revoke those external copies. Before enabling a named social platform in a public deployment, document and verify its current refresh or purge procedure. For a privacy report, unpublish first, request refresh through each supported platform, and communicate that already-delivered previews may remain outside Bureau control.

The owner can unpublish, restore an owner-unpublished and unexpired record, or hard-delete its content, credential digest, cascading reports, and consultation responses. Bureau-unpublished records remain unavailable and cannot be restored by the owner. Expiry removes public access after 180 days but does not automatically destroy retained content or consultation aggregates. A later retention decision may add export or scheduled purge only after backup and operational review.

Reports store only public record identity, one categorical reason, status, and timestamps. They neither copy record content nor trigger automatic takedown. With the same database configuration used by the application, an operator can inspect or act on the queue:

```sh
npm run records:operate -- list-reports
npm run records:operate -- unpublish rec_0123456789abcdefghijkl
```

The listing excludes aliases, witness statements, and determination prose. Unpublishing and report resolution occur in one transaction. Owner deletion cascades associated reports. The application records no reporter free text or reporter identity; public-report abuse controls remain a later deployment refinement.

If the experiment is shelved, an explicit runbook should export anything intentionally retained, remove unnecessary records and secrets, disable paid services, and verify that public routes no longer expose case content.

## Release completion

Before deployment or tagging:

- run the canonical automated verification workflow;
- inspect the production build or equivalent artifact;
- exercise the primary journey from a clean browser session;
- verify error and exhausted-budget behavior;
- confirm environment configuration and secret boundaries;
- confirm version and changelog;
- verify that the public repository contains no private working material;
- obtain explicit human approval for any major-version promotion.
