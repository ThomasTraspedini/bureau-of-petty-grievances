# 0009 — Locale-aware determination language pipeline

## Status

Accepted.

## Context

The deterministic Chronology assessment establishes facts, severity, accepted factors, remedy authority, and presentation parameters without producing localized prose. The next boundary must add useful linguistic specificity while preventing a model from changing the Bureau's judgment, inventing facts, expanding remedy authority, or becoming a single point of failure.

The pipeline also needs a provider implementation that is inexpensive at evaluation scale without making product quality depend on cost alone. Provider output cannot be trusted merely because it conforms to JSON, and ordinary verification cannot depend on network access or paid calls.

## Decision

Determination language uses schema version `1`, shared by provider and fallback paths. It contains an explicit content locale and deterministic disposition plus localized allegation, finding, consequence, mitigation, remedy title, remedy instruction, and closing. Each factual section declares language-neutral grounding references and has a hard length limit.

Chronology editorial policy version `1` is owned by the English locale. It defines Bureau voice, preferred vocabulary, examples, safety limits, prompt-injection treatment, and grounding requirements. Schema and editorial-policy versions evolve independently. A future persisted localized snapshot retains both, while provider model and request identifiers remain operational metadata.

The first adapter uses the OpenAI Responses API through the official Node SDK. Its configurable default is `gpt-5.6-luna` with low reasoning effort because deterministic policy already owns judgment and the model performs bounded linguistic realization. The request uses strict Structured Outputs, disables provider-side response storage, omits the respondent alias and exact clock time, limits output, and sends the witness statement only as untrusted submitted data. A model change requires the same contract and locale-specific editorial evaluation; it does not change the domain schema by itself.

The SDK performs no automatic retry and has a 12-second timeout. Server orchestration permits one initial attempt and one retry for transient provider failures or output rejected by deterministic validation. Refusal, missing configuration, authorization failure, and non-retryable request rejection use fallback immediately.

Runtime validation covers exact structure, schema version, locale, disposition, grounding references, length, required factual anchors, permitted numbers, restricted content, prohibited claims, Bureau tone, and remedy compliance. It does not make a second model call to judge the first. Curated contract fixtures supply semantic and editorial evidence beyond structural validation.

Every valid Chronology command has a complete compositional English fallback with the same schema. Terminal provider outcomes return that fallback with a categorical internal reason; raw provider errors, refusals, and invalid text do not enter product output. A mismatched filing and assessment is rejected before any provider call.

The pipeline is exposed through an owned server orchestration seam and an explicit opt-in live-provider smoke test. The current filing UI does not yet invoke or present final determination language; loading, reveal, persistence, credits, and public records remain later capabilities.

## Consequences

- A provider can improve specificity without selecting the disposition, severity, accepted facts, or remedy authority.
- Provider, fallback, and future persistence consume one validated localized shape.
- English guidance can evolve without silently changing the shared schema, and another locale cannot reuse English editorial assumptions.
- At most two paid calls can occur for one orchestration attempt, while provider absence or failure still produces complete language.
- The model remains replaceable and configurable, but a cheaper model is accepted only while representative fixtures and live evaluation preserve the product's quality bar.
- Ordinary tests remain deterministic and provider-free; live integration requires deliberate credentials and invocation.

## Open considerations

Rendered determination layout, procedural identity, persistence, credit reservation, idempotency, global budgets, safety identifiers, provider-retention review, observability, and production model promotion criteria remain part of later capabilities or deployment readiness.
