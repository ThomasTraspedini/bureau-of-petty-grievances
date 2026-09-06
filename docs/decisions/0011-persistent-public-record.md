# 0011 — Persistent public record

## Status

Accepted.

## Context

The complete Chronology determination existed only in validated tab-scoped state. Making it durable introduces publication consent, database failure, public and private identities, immutable localized content, lifecycle authorization, expiry, reporting, cache invalidation, and deletion obligations. A public identifier cannot safely double as an owner credential, and a report control is misleading unless it creates an actionable operational record.

## Decision

Publication is an explicit choice during the 30-minute transient lifetime. The filer reviews the fields that will become public, then one idempotent PostgreSQL transaction stores relational lifecycle metadata and a versioned JSONB snapshot containing the validated filing, assessment, localized language, procedural identity, and presentation variant. A failure preserves the transient determination and creates no partial record.

The persistence contract is portable PostgreSQL with Neon Free as the production target (superseding the initial Supabase target under [0025](0025-production-deployment-stack.md)) through a server-only pooled `DATABASE_URL`. PGlite supplies an embedded local and test runtime using the same schema and repository behavior. Schema migration is idempotent and runs when the repository starts.

The public path uses a random 128-bit base64url identifier. A separate random 256-bit owner credential is carried in a private recovery-link fragment, removed from browser history after use, retained only in tab storage, and persisted only as a SHA-256 digest. Constant-time digest comparison authorizes owner controls. Public paths, metadata, rendered content, and report records never contain the credential.

Records begin `published` and expire from public access after 180 days. An owner can move a published record to `owner_unpublished`, restore it before expiry, or hard-delete the record and its reports. Bureau action moves any retained record to `bureau_unpublished`; the owner cannot reverse that state. Expiry and unpublishing do not silently destroy retained content.

Public rendering is unlisted, `noindex`, `nofollow`, dynamic, and `no-store`. Missing, expired, unpublished, deleted, and temporarily unavailable records share one non-enumerating response. Visitors submit one of four localized report categories without free text. Reports are idempotent and durable but never trigger automatic takedown; an operator can list categorical open reports and atomically unpublish a record while resolving its reports.

## Consequences

- The same validated provider or fallback determination becomes a durable immutable localized snapshot without regeneration or silent translation.
- Losing the private recovery address means losing owner authority; the public address cannot recover or infer it.
- Immediate dynamic reads favor lifecycle correctness and privacy over caching. Social preview invalidation remains a later sharing concern.
- PostgreSQL uniqueness and transactions protect idempotency, report deduplication, and deletion cascade, while canonical tests require no external database account.
- Public reporting is actionable without storing new personal allegations or giving anonymous visitors an automatic takedown mechanism.

## Open considerations

Dedicated sharing controls, social metadata and cache invalidation, consultation, repeat-response resistance, access entitlements, credits, rate limits, analytics, backups, production deployment, and any retention change remain later decisions.
