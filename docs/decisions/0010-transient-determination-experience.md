# 0010 — Transient determination experience

## Status

Accepted.

## Context

The filing, deterministic assessment, and locale-aware language pipeline existed as separate trusted boundaries, but the production journey stopped before presenting a determination. Rendering the result before persistent records also creates a risk of implying that a durable case, public address, access entitlement, or credit event already exists.

The experience needs procedural identity, refresh recovery, provider invocation, designed loading and failure, and a stable fact reconstruction without pre-empting the lifecycle and public-identifier decisions owned by persistent records.

## Decision

One accepted filing server action validates the draft, calculates the deterministic assessment, and invokes the owned language orchestration. It returns either a complete issued determination, typed validation errors, or a terminal internal failure. Provider and fallback language use the same rendered hierarchy; source and categorical fallback reason remain internal.

An issued transient determination receives a random, non-sensitive reference in the grammar `CHR · YYYY · XXXXXX`. The reference is not a persistent case number or public identifier. It combines with the assessment's approved non-sensitive visual seed to select one of four curated presentation variants; respondent alias, witness prose, relationship, and exact clock time remain excluded.

The result is stored only in a versioned, locale-bearing `sessionStorage` envelope for 30 minutes. Restoration revalidates the filing, recomputes the assessment, and validates the localized language before rendering. Refresh in the same tab restores the result. Missing, expired, malformed, or inconsistent state returns the filer to review with localized guidance and preserves the existing safe device-local draft.

The localized `/en/determination` route renders procedural metadata, disposition, grounded language, the submitted witness statement, a semantic Chronology reconstruction, reasons, mitigation, remedy, and an explicit transient-state notice. The route is `noindex` and makes no claim of persistence, publication, consultation, sharing, investigation, human review, or credit use.

Loading copy appears only while the real action is pending and never imposes a minimum delay. A terminal internal failure preserves the draft and offers retry or review. The completed record uses one restrained 700-millisecond reveal; reduced-motion presentation is immediate.

## Consequences

- A complete filing now reaches the strongest production moment while remaining honest about the absence of a public record.
- Provider configuration can improve language, while missing configuration and provider failure still produce the same complete experience through fallback.
- Retrying after a terminal failure may make another bounded provider attempt; automatic UI retry and retry loops remain prohibited.
- Browser session state is recovery for the current tab, not durable persistence or an authorization boundary.
- The future persistent-record capability may replace the transient reference with an unguessable record identity and must define migration, ownership, lifecycle, and deletion separately.

## Open considerations

Persistent identifiers, durable localized snapshots, idempotency, credit reservation and refund, public rendering, reporting, unpublishing, deletion, consultation, sharing, and social previews remain later capability decisions.
