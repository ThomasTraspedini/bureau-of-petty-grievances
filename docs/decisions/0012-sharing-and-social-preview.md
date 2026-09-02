# 0012 — Sharing and social preview

## Status

Accepted.

## Context

A durable public determination is readable at an unguessable address, but an address alone is not a deliberate share experience. Sharing introduces browser capability differences, canonical-origin trust, record-specific metadata, social-image generation, and crawler copies that may outlive an application lifecycle change. Rich previews also risk moving identifying or private record content into third-party caches.

## Decision

An available public record presents one primary share action backed by the native Web Share API when supported, an explicit copy-public-link action, and a read-only selectable address as the final fallback. Native-share failure falls back to copying except when the person cancels. The product does not encode platform-specific social destinations.

A validated server-only `BUREAU_PUBLIC_ORIGIN` owns canonical public URLs. Production public-record rendering fails closed to the existing unavailable state when this setting is missing or invalid. Development and test may use a loopback default. Request host headers never establish canonical identity.

A versioned, language-neutral share descriptor contains only department, fixed disposition, procedural reference, offence code, discrepancy minutes, mitigation code, and curated presentation variant. Locale-owned copy converts that descriptor into the share payload, canonical metadata, accessible image description, and visible preview. Respondent aliases, witness statements, exact clock times, full generated prose, relationship context, impact details, public identifiers as visible preview text, and owner credentials are excluded.

Each available record receives a deterministic 1200 by 630 PNG rendered from code with the Bureau's procedural identity and curated presentation accent. The image uses no generated or external raster asset. Its URL includes the record lifecycle revision. The route revalidates both current availability and that revision on every uncached request; stale, expired, unpublished, deleted, malformed, and unavailable requests return no image.

Public HTML and preview responses remain dynamic, `noindex`, and `no-store`. Application-controlled caches therefore do not preserve record-specific previews after a lifecycle change, and restoration produces a new revisioned image URL. Third-party crawlers may retain bytes and metadata they already fetched despite these directives. The product minimizes the retained content and documents that platform-specific refresh or purge procedures must be added when deployment and target platforms are selected; it does not claim universal revocation.

## Consequences

- Mobile devices can use their familiar share sheet while every supported browser retains copy and manual-selection paths.
- Canonical URLs cannot be redirected by an untrusted request header, but production public records require one explicit non-secret deployment setting.
- Preview specificity comes from bounded structured facts rather than identifying prose.
- Share images remain recognizable across messaging and social contexts without a generative service or additional paid action.
- Owner authority never enters the share surface, client payload, metadata, image, or copied value.
- Lifecycle invalidation is immediate for fresh application requests, while already-cached third-party copies remain an explicit and minimized residual risk.

## Open considerations

Hosting-specific cache purge, platform refresh integrations, share analytics, consultation, successor invitation sharing, and translated immutable determinations remain later decisions.
