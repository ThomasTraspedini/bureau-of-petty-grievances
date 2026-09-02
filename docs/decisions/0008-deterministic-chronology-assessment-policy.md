# 0008 — Deterministic Chronology assessment policy

## Status

Accepted.

## Context

A validated Chronology filing supplies three different timing grammars, a low-stakes consequence, required mitigation, relationship context, an alias, and bounded witness language. The determination pipeline needs an inspectable assessment before generative wording, persistence, or presentation can be trusted. Treating prototype thresholds or hidden weighted scoring as production policy would make consequence, fairness, and remedy boundaries difficult to explain or version.

Presentation also needs stable variation without allowing a visual seed to encode personal prose, identifiers, social context, or exact clock times.

## Decision

Chronology assessment policy version `1` is a pure, framework-independent transformation of a validated Chronology filing.

- Premature departure and chronic lateness use submitted delay minutes as their discrepancy. Optimistic estimates use actual minutes minus estimated minutes.
- Base severity is `limited` for 1–14 minutes, `established` for 15–29 minutes, and `material` from 30 minutes onward.
- A held table, repeated updates, or compressed plans raises severity by exactly one level, capped at `material`. Irritation alone is accepted as contextual and does not raise severity.
- Required mitigation is always accepted and visible. It does not erase the discrepancy or lower factual severity; it requires circumstances to be noted and caps the remedy at three future occasions.
- Each offence selects one remedy family: departure-language protocol, arrival-notice protocol, or estimate-calibration protocol. Remedies are non-binding, private, limited to one occasion for limited severity and three otherwise, and adapted to personal or professional relationship context.
- Remedy constraints prohibit coercion, exclusion, health or safety restrictions, material deprivation, monitoring, and public humiliation.
- Presentation exposes a bounded timeline scale and marker plus a four-way stable visual variant. Its seed uses only the policy version, offence, base severity band, impact code, mitigation code, and remedy family. Alias, witness statement, relationship, and exact clock time are excluded.
- Any policy change capable of changing assessment output requires a new assessment version. Refactoring that preserves all outputs does not.

The assessment contains language-neutral codes and explicit locale context, but no final finding prose. The reviewed filing server boundary returns the assessment after runtime validation without persisting it or issuing a determination.

## Consequences

- The same validated filing and policy version always produce the same inspectable result.
- Consequence affects severity through one visible rule rather than opaque weights; mitigation constrains treatment without cancelling established facts.
- Future generative and deterministic-fallback stages can be grounded against explicit discrepancy, factor, and remedy constraints.
- Future presentation can use stable procedural variation without deriving identity from personal input.
- Material policy changes require deliberate version migration for any persisted assessments introduced later.

## Open considerations

Outcome selection, localized deterministic fallback language, generative editorial policy, persistence migration, and cross-department assessment policy belong to later capabilities.
