# 0003 — Agent-task release versioning

## Status

Accepted.

## Context

Development proceeds through agent tasks that each leave the product coherent and verifiable. The product roadmap may contain larger capabilities, while debugging and follow-up tasks may be created between them. Version history should expose these concrete work units.

## Decision

The release unit is a completed agent task that changes tracked files in the product repository.

- Initial version: `0.1.0`.
- Planned task: increment `MINOR`.
- Distinct unplanned debugging, correction, hardening, or extra task: increment `PATCH`.
- Work completed inside the original task shares its one release.
- No tracked product change means no product commit, version, changelog entry, or tag.
- Every major promotion requires explicit human approval; an agent may propose one.
- Each product release updates `VERSION` and `CHANGELOG.md` and receives an annotated `vX.Y.Z` tag after validation.

This convention uses SemVer notation as a product cadence. It does not claim that each minor release changes a public library API.

## Consequences

- Git history, changelog, version, and agent-task boundaries stay aligned.
- Documentation-only changes inside the product repository are releases because they change the evaluated product artifact.
- Work only in private or ignored files does not inflate product versions.
- `0.9.0` advances to `0.10.0` unless a separately approved task promotes the product to `1.0.0`.

## Open considerations

The first public deployment and `1.0.0` are taste and readiness judgments requiring explicit human approval rather than an automatic version calculation.
