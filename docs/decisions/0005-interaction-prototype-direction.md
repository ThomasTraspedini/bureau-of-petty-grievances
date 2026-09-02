# 0005 — Interaction prototype direction

## Status

Accepted.

## Context

The application stack was intentionally deferred until a complete primary journey could be rendered and evaluated. The prototype needed to establish visual identity, interaction behavior, copy hierarchy, responsive composition, motion intent, and recovery states without turning a framework choice into an accidental product decision.

The initial departments require different fact grammars, but implementing four complete adaptive trees before one path had been evaluated would confuse breadth with evidence.

## Decision

Use a repository-native interactive web prototype built with static HTML, CSS, and browser JavaScript modules. It has no production framework, dependency installation, build step, persistence, provider integration, or deployment requirement.

The accepted rendered direction uses:

- deep civic blue, luminous warm ivory, and optimistic apricot;
- self-hosted Public Sans for interface copy, Source Serif 4 for institutional and editorial hierarchy, and IBM Plex Mono for procedural metadata;
- an owned double-ring civic seal with a typographic Bureau monogram, carrying pre-digital institutional continuity into a precise SVG identity system;
- controlled state transitions and one determination reveal, with an equivalent reduced-motion presentation;
- a complete representative Chronology journey, while the other three departments remain visible as institutional classifications without simulated adaptive depth.

All interface copy sits behind an explicit English locale catalog. The `/prototype/en/` route, browser-local draft key, date formatting, number formatting, and state fixtures retain explicit locale behavior.

## Consequences

- Evaluators can review the complete journey directly from the repository before a production stack exists.
- The shared seal and two-line institutional signature make the Bureau feel established before its complete digital transition, without resorting to nostalgic document styling or courtroom imagery.
- The visual system and responsive behavior are concrete enough to guide application-foundation choices.
- The prototype demonstrates access, adaptive filing, correction, processing, determination, consultation, sharing, successor authorization, rejection, and recovery as designed states.
- Production code may reuse product decisions and content structure, but must not treat prototype interaction code as an application architecture or domain implementation.
- Digital Conduct, Domestic Affairs, and Social Planning still require their own polished adaptive logic before they become enabled filing paths.

## Open considerations

The application framework, runtime, localization library, production font delivery, persistence, hosting, analytics, model provider, and deployment remain deferred to evidence-based decisions in later capabilities.
