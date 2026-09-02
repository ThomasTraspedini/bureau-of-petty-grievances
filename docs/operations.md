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

The application foundation produces a full Node.js server build on Node.js 24. This preserves the framework capabilities required for later protected server actions and dynamic public records. The hosting provider remains deferred until persistence, preview isolation, cost, and operational needs can be evaluated together.

The rendered application has no required secrets because provider absence selects the complete deterministic fallback. When configured, the filing server action invokes the adapter using `OPENAI_API_KEY` and a configurable `BUREAU_OPENAI_MODEL` whose default is `gpt-5.6-luna`; credentials remain in ignored local or deployment configuration. Production font files are bundled locally. CI and local verification explicitly provide no provider credential, make no provider calls, and use the same repository command after installing dependencies and the Playwright Chromium browser.

The production filing sends a reviewed draft to the server for runtime validation, deterministic assessment, language realization, and transient determination issuance. It does not store content server-side, reserve credit, or produce a public record. The safe draft remains in a locale-bearing, versioned browser envelope for no longer than 30 days and can be reset explicitly. The issued result uses a separate validated tab-scoped envelope with a 30-minute lifetime. Content rejected as serious, sensitive, or unnecessarily identifying is not retained in either accepted path.

The language seam sends a matching assessment command to the OpenAI Responses API only when deliberately invoked with configuration. Requests disable response storage, exclude the respondent alias and exact clock time, bound output, use a 12-second SDK timeout, and disable SDK retries. The product owns at most one retry and converts provider responses, refusals, and failures into typed outcomes. Raw provider errors and invalid text are discarded; a complete locale-owned fallback remains available for every valid Chronology command.

## Cost controls

The quality bar determines the generative approach. Budget controls prevent runaway spend instead of encouraging deliberately weak output.

Required controls include:

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

## Observability

Operational signals should distinguish:

- validation and safety rejection;
- provider failure or malformed output;
- persistence and transaction failure;
- exhausted entitlement or global budget;
- rate limiting;
- client rendering and sharing failure.

Logs and analytics must use record identifiers and categorical metadata, never respondent names, witness statements, prompts containing personal text, or full generated determinations.

## Data and privacy operations

- Public records are unlisted and `noindex` by default.
- Reporting and owner-controlled unpublishing must be operational, not decorative.
- Deletion must remove or irreversibly detach public access and associated private content.
- Lifecycle and retention remain configurable.
- Social previews and caches require an invalidation path after unpublishing.
- Backups, exports, and provider retention must be understood before public evaluation.
- Provider data controls and retention must be reviewed before configuring a provider in a public deployment; `store: false` is necessary but not the whole deployment privacy review. A deployment can remain fully usable through deterministic fallback while that review is pending.

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
