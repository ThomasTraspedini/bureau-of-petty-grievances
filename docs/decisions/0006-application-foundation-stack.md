# 0006 — Application foundation stack

## Status

Accepted.

## Context

The interaction prototype established the complete journey, visual direction, responsive behavior, locale boundary, and recovery expectations without choosing a production framework. The application foundation now needs server-capable rendering, explicit locale routing, strict types, localized metadata, self-hosted fonts, and a testable path toward later persistence and generative capabilities.

The foundation should minimize evaluator setup and operational complexity without binding domain rules to a framework or selecting persistence, model, analytics, or hosting providers prematurely.

## Decision

Use the following production foundation:

- Next.js 16 App Router with React and strict TypeScript;
- the Node.js 24 LTS line for development, verification, and the full Node.js server deployment shape;
- npm with a committed lockfile and pinned package-manager declaration;
- `next-intl` with typed JSON catalogs and an always-present locale route segment;
- native CSS using the accepted visual tokens rather than a utility framework or component library;
- the accepted self-hosted font files loaded through `next/font/local`;
- ESLint, Prettier, Vitest with Testing Library, Playwright, and axe-core in one canonical verification workflow.

Application routes and rendering are framework concerns. Deterministic domain rules remain framework-independent. Server-only orchestration and provider adapters will receive separate source boundaries when the first capability needs them; dependency rules already prohibit those layers from importing application views.

The production shell renders `/en` and rejects unsupported routes through a localized unavailable state. English is the only enabled interface locale, not an implicit default inside views. The hosting provider remains deferred; the selected full Node.js server output preserves all framework capabilities and can be deployed by a later release decision.

## Consequences

- The production application can grow through server-rendered vertical capabilities without migrating away from a static-only foundation.
- Locale routing, formatting, messages, metadata, and future locale expansion share one explicit boundary.
- Existing font assets remain private to the repository and create no runtime dependency on a font CDN.
- The static prototype remains separate interaction evidence rather than becoming production state or domain logic.
- Visual, accessibility, reduced-motion, and pseudo-localization checks begin with the first rendered production shell.
- Node.js 24 and a Playwright browser installation are local verification prerequisites.
- Hosting-specific adapters, persistence, provider integrations, and component-library choices remain deferred until a product capability supplies evidence for them.

## Open considerations

The hosting provider, persistence provider, analytics provider, model provider, and exact server orchestration for paid actions remain future decisions. A component library should be introduced only if repeated production interactions establish a genuine shared primitive.
