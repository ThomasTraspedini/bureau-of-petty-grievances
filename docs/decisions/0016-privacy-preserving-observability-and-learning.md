# 0016 — Privacy-preserving observability and learning

## Status

Accepted.

## Context

Fast production iteration requires evidence about where people enter, which filing paths they choose, where they stop or correct answers, whether determinations complete, how provider reliability and cost change, and whether sharing leads to reading or consultation. Raw filing content, durable person-level identity, automatic DOM capture, and replay would make those questions easier to explore but would contradict the Bureau's privacy boundary and the harmless nature of the service.

Operational logs alone cannot reconstruct a product journey. A browser-direct analytics SDK would also expose provider configuration and make it easier for unreviewed properties or automatic capture to spread through the interface.

## Decision

The Bureau owns a versioned, language-neutral analytics event contract with an exact property allowlist. Explicit browser events cross a bounded same-origin endpoint; server events use the same validated contract. Mixpanel is the first production adapter, selected server-side and replaceable behind the owned provider interface. Analytics is disabled unless a deployment supplies a complete explicit configuration.

One random tab-scoped journey identifier connects steps in a single browsing journey. It is held only in `sessionStorage`, creates no analytics cookie, and is not reused across tabs or browser sessions. Public records and successor invitations may be correlated only through purpose-separated keyed pseudonyms. Raw public identifiers, credentials, URLs, referrers, network addresses, filing answers, aliases, witness statements, prompts, generated prose, and arbitrary metadata are prohibited.

The initial analysis contract covers the primary funnel, filing path and drop-off, generation health and estimated cost, shared-record engagement, successor propagation, and operational reliability. Release and pricing versions are attached to delivery. Provider-reported token counts feed a deployment-configured price snapshot; analytics never becomes part of the generation transaction or its success condition.

No autocapture, session replay, heatmap, advertising identity, cross-device profile, or browser-side provider SDK is enabled. An enabled deployment gives a concise localized disclosure. Events expire after 180 days in the analytics provider; the application keeps no second persistent telemetry copy. Identifier-free aggregate release summaries may be retained longer.

## Consequences

- The team can compare paths, completion, latency, fallback, cost, sharing, consultation, reporting, and successor behavior by release without reading case content.
- Analytics supports correlation and before/after comparison, not proof of causality or user motivation. Low-volume segments require qualitative follow-up before product decisions.
- A tab reset or browser boundary intentionally breaks the journey. Cross-session retention and unique-person counts are not available.
- Delivery is best-effort with a short timeout. Missing or rejected telemetry cannot alter a user-visible outcome.
- Mixpanel project retention, regional ingestion, geolocation suppression, and disabled autocapture/replay are deployment checks rather than assumptions made by the application.

## Open considerations

Consent requirements must be reassessed before introducing persistent identity, cookies, advertising attribution, new locales or jurisdictions, session replay, richer device data, or any additional analytics provider. Experiment assignment, qualitative feedback capture, warehouse export, and statistical testing remain outside this capability.
