# 0020 — Supported-browser verification baseline

## Status

Accepted.

## Context

The complete product journey had strong Chromium behavior, accessibility, responsive, reduced-motion, and visual coverage, but no executable contract for other browser engines. Cross-journey refinement needs broader compatibility confidence without tripling a large persistence-heavy suite or maintaining rasterization-specific screenshots that provide little additional product evidence.

The essential journey crosses several browser-owned boundaries: locale navigation, keyboard controls, local and session storage, responsive layout, motion preferences, public-record actions, consultation recovery, and native-share or clipboard availability. A compatibility baseline should exercise those seams through real production rendering and repository-owned persistence while remaining reproducible locally and in CI.

## Decision

Treat the Chromium, Firefox, and WebKit versions pinned by Playwright as the automated browser-engine baseline for the first release.

The complete established end-to-end suite and reviewed pixel references remain in Chromium. A bounded compatibility contract also runs in Firefox and WebKit and proves one provider-free localized journey from filing through determination, publication, public consultation, and manual sharing fallback. It exercises a mobile viewport, representative desktop rendering, refresh recovery, keyboard interaction, reduced motion, and axe-core accessibility.

Compatibility code remains standards-based. Do not add user-agent branches to satisfy the matrix. Pixel references remain Chromium-only and may change only after manual review.

## Consequences

- Canonical verification detects material engine-specific regressions without multiplying every expensive lifecycle scenario.
- The supported claim is explicitly an automated engine baseline, not a guarantee for every vendor release, extension environment, or physical device.
- Firefox and WebKit failures in the bounded contract block a release just as Chromium failures do.
- Visual comparison remains stable and intentional instead of becoming a collection of engine-specific rasterization noise.
- Physical-device and moderated usability evidence remain necessary before completing cross-journey refinement and the evaluation release.

## Open considerations

Broader pseudo-localized browser rendering, narrow-width refinement, failure injection, physical-device review, and moderated usability testing remain separate resilience work. Promotion of additional browsers or a specific vendor-version policy requires evidence and a later decision.
