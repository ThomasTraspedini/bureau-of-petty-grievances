# 0014 — Evaluation access and cost control

## Status

Accepted.

## Context

The determination pipeline could use a paid language provider but had no access entitlement, durable credit accounting, request idempotency, rate limits, global dispatch budget, proactive thresholds, or operator kill switch. Evaluation access also needs to be easy to forward internally without leaving its bearer credential in browser history or public records.

The complete deterministic language path must remain usable when paid generation is absent or unavailable. Cost controls therefore protect optional provider calls rather than becoming a new failure point for the core filing journey.

## Decision

An evaluator grant is a revocable database record with an initial pool of 100 logical provider-backed determinations and a 30-day lifetime. Its random 256-bit bearer token travels in a URL fragment, is retained only as a SHA-256 digest, and is exchanged immediately for a separate random 256-bit browser-session credential. The fragment is removed before exchange; the session uses an `HttpOnly`, `SameSite=Lax` cookie, lasts at most 14 days, and never outlives its grant. Standard codes and successor invitations remain separate later entitlements.

Visitors without valid paid access still receive the complete deterministic determination. Invalid, expired, revoked, exhausted, disabled, globally exhausted, and persistence-unavailable paid paths also select that fallback without exposing an unofficial quality tier. Only rate-limited requests pause completion, preserve the filing and idempotency key, and return localized retry guidance.

One browser-held random filing key identifies a logical generation request. The server stores its session-scoped uniqueness, a SHA-256 filing digest, non-sensitive procedural reference, categorical state, attempt count, and timestamps for 30 minutes; it stores no filing fields, prompt, provider output, or determination prose. Concurrent duplicates reserve one credit. A duplicate while the first request holds its 30-second lease waits; an expired ambiguous dispatch recovers through deterministic fallback and never makes another provider call.

The evaluator credit is atomically reserved before orchestration. Valid provider language consumes one credit. Deterministic fallback or terminal internal failure refunds it. The separate global budget counts each provider request immediately before dispatch and never refunds that unit, because the external spend may already have occurred. Its initial limit is 200 attempts, matching the existing maximum of two attempts for each of the initial 100 evaluation credits.

Generation starts are limited to three per minute per browser session, 20 per minute per coarse network identity, and 30 per minute per evaluator grant. Link exchange uses the network and grant limits. Network addresses are normalized only in memory and retained as daily HMAC digests; production paid access fails safely to fallback when the secret or trusted-proxy configuration is unavailable.

A durable database switch can disable provider generation without a redeploy. Operator commands create, inspect, extend, top up, and revoke evaluator grants; add global attempt budget; enable or disable generation; and inspect or acknowledge alerts. Crossing 75, 90, or 100 percent of either an evaluator pool or global budget creates one durable categorical alert. An optional HTTPS webhook delivers pending alerts without case content.

## Consequences

- Forwarded evaluator access creates separate revocable browser sessions while the shared link credential avoids request logs and browser history.
- A successful ordinary evaluation shows no code step, counter, or quota control.
- PostgreSQL transactions and uniqueness constraints prevent concurrent overspend and duplicate logical credit use.
- Global attempt accounting remains conservative even when a provider call fails or its response becomes ambiguous.
- Exact cost idempotency does not require retaining private filing or generated content. Recovery may use different fallback wording while preserving the same facts, assessment, and procedural reference.
- The server must receive a trustworthy proxy-appended network header in production; direct untrusted access to the application origin is outside the supported deployment boundary.
- Provider-level spend limits remain a separate defense configured with the provider rather than inferred from application counters.

## Open considerations

Standard five-credit access and successor invitations remain C11. Hosting-specific trusted-proxy values, scheduled webhook delivery, provider-account spend-limit procedures, analytics, multi-region coordination, and broader public-mutation abuse controls remain deployment or later-capability work.
