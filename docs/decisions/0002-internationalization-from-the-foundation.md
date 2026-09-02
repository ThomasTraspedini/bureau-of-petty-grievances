# 0002 — Internationalization from the foundation

## Status

Accepted.

## Context

Adding internationalization after UI copy, validation, persistence, URLs, generated content, and fallback behavior already assume English would be expensive and error-prone. Generative language also requires more than translating interface strings.

## Decision

Internationalization is a system boundary from the first implementation task. English is the first and only initially enabled locale.

- Locale is explicit in routes and requests.
- Interface locale and determination locale are distinct.
- Domain codes remain language-neutral.
- User-facing strings, validation, metadata, errors, accessibility text, and deterministic fallback use localization resources.
- Generated content is stored as a localized snapshot with locale and prompt-policy version.
- Locale-specific generative guidance and evaluation sit around a shared structured schema.
- Pseudo-localization becomes part of automated rendered-UI verification.

## Consequences

- Initial implementation carries a small amount of explicit locale plumbing.
- Hardcoded user-facing strings are defects even while English is the only enabled locale.
- Changing interface locale does not silently translate an existing determination.
- A new locale cannot be enabled until copy, layout, safety, prompts, fallback, and evaluations are complete.

## Open considerations

The framework, URL-router implementation, localization library, catalog format, and translation workflow remain deferred until the application stack is selected.
