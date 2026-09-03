# 0022 — Multilingual product routes

## Status

Accepted.

## Context

An enabled locale is a complete product boundary, not a translated navigation shell. Filing, deterministic and provider-generated determination language, validation, recovery, publication, sharing, consultation, and persisted records must all preserve the language selected at the route and request boundary.

French, German, Spanish, and Brazilian Portuguese have now met the same release bar established for English and Italian. Each language has a complete message catalog and placeholder contract; department-specific provider instructions, deterministic fallbacks, vocabulary anchors, and hostile-output validators for Chronology, Digital Conduct, Domestic Affairs, and Social Planning; and route-level end-to-end coverage through filing, determination recovery, publication, and public consultation.

## Decision

Enable French (`fr`), German (`de`), Spanish (`es`), and Brazilian Portuguese (`pt-BR`) as public product routes alongside English (`en`) and Italian (`it`). Locale remains explicit in URLs, filing commands, provider requests, browser storage envelopes and keys, determination snapshots, public-record persistence, metadata, and test fixtures.

Every enabled language owns a formal, locally appropriate editorial register:

- French uses respectful `vous` forms and restrained administrative phrasing.
- German uses formal `Sie` forms and precise, composed administrative phrasing.
- Spanish uses formal `usted` forms and calm, direct administrative phrasing.
- Brazilian Portuguese uses a courteous formal Brazilian register, with respectful direct address and natural Brazilian vocabulary.

All four registers preserve benevolent overreach. The Bureau is sincere, useful, exact, and proportionate; the quiet humor comes from excessive institutional care for a harmless interpersonal irritation. It never uses sarcasm, cruelty, threats, mock-judicial punishment, or an acknowledgement that the service is a joke.

An enabled locale must use its own policy, fallback, and validation path for all four departments. Unsupported locale input is rejected at the route and request boundaries; the English catalog may describe that unavailable state, but it is never used to issue a determination for an unsupported locale. A valid supported-locale filing must never silently receive English determination language.

Locale-specific browser storage prevents a filing or transient determination from crossing language routes accidentally. Persisted records store an immutable localized determination snapshot together with its locale and prompt version. Reopening, publishing, sharing, or consulting a record preserves that issued language; changing the interface locale never retranslates an existing snapshot.

Activation requires recursive catalog-key and placeholder parity, locale-specific language and safety evaluation, route and server-boundary validation, accessibility checks, refresh recovery, and an end-to-end public-record journey for each locale.

## Consequences

- `/fr`, `/de`, `/es`, and `/pt-BR` expose complete product journeys rather than interface-only translations.
- Deterministic continuity remains available in the requested supported language when a provider is unavailable or rejects output.
- Public records retain their original issued language across lifecycle actions and sharing.
- Editorial policies and vocabulary may evolve independently per locale while the language-neutral schema and domain codes remain shared.
- A future public locale must satisfy the same complete catalog, four-department language, safety, storage, persistence, accessibility, and route-evaluation contract before activation.

## Open considerations

Cross-locale translation of an issued determination remains outside the product contract. Adding such a capability would require an explicit derived-record model that preserves the original immutable snapshot and clearly distinguishes any later translation.
