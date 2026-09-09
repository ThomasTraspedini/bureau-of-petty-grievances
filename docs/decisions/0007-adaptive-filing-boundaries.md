# 0007 — Adaptive filing boundaries

## Status

Accepted.

## Context

The production filing journey needs reliable correction, refresh recovery, runtime validation, and facts suitable for later deterministic assessment. It must remain useful before determination, persistence, access, and credit capabilities exist. A client-only form with generic timing fields would obscure route state, weaken server trust, and flatten materially different Chronology grievances into one shape.

Device-local recovery also stores limited personal language. Preservation therefore needs a visible lifetime, validation before restoration, and a rule for content that the Bureau has already determined is outside its harmless scope.

## Decision

- Each filing phase has a validated, localized route under `/{locale}/file/{step}`. Review correction uses the same routes and returns directly to the review after a valid change.
- Chronology uses language-neutral codes and three distinct fact variants: premature departure declarations, chronic lateness, and optimistic preparation estimates.
- Framework-independent domain validation normalizes a complete draft. Browser feedback and a server action reuse this boundary; the server action validates but does not persist, charge, investigate, or create a determination.
- The completed presentation requires a short-lived session marker issued only after the server action accepts the draft. Direct navigation returns to review rather than claiming validation that did not occur.
- A draft begins empty and is stored in a versioned, locale-bearing browser envelope for 30 days. Invalid, expired, future-dated, or unsupported stored data is discarded safely.
- Alias and witness language are bounded and screened conservatively for unnecessary identifiers and serious or sensitive matters. Rejected witness text is not written to browser storage; the remaining safe draft is preserved.
- Filing controls remain unavailable until browser storage has been validated and loaded, preventing recovery from overwriting a filer’s first interaction.

Filing step transitions intentionally use full document navigation: each destination re-enters the established storage-backed hydration/recovery protocol with fresh transient React state. This simplifies same-route reset and completed-session/recovery semantics (see [ADR 0024](0024-completed-filing-restart-semantics.md)). The accepted determination transition similarly establishes a clean presentation/reconstruction boundary. Client-side Next navigation could be implemented, but requires an explicit equivalent lifecycle/reset contract; it is not a mechanical replacement.

## Consequences

- Native browser navigation, refresh recovery, and review correction are first-class behavior rather than incidental client state.
- Later deterministic assessment receives a validated discriminated union instead of interpreting view fields.
- The current journey ends honestly with server-validated facts on the device; it does not simulate an issued determination or a persistent submission.
- Device-local storage is recovery, not persistence or secrecy. Later persistent records require a separate lifecycle and provider decision.
- Safety screening is deliberately conservative and deterministic. It is a product boundary, not a claim to comprehensive moderation.

## Open considerations

Persistent draft ownership, cross-device recovery, access credentials, credit reservation, and the transition from a validated filing into a stored determination remain deferred to their roadmap capabilities.
