# 0013 — Public consultation

## Status

Accepted.

## Context

Public determinations need a participatory response that strengthens the Bureau fiction without becoming an account system, a legal vote, or a harassment surface. Consultation also introduces concurrent updates, repeat submissions, honest empty results, lifecycle changes, and a privacy tradeoff: stronger uniqueness mechanisms would require increasingly invasive visitor identity.

## Decision

Every available public record exposes the three approved language-neutral positions: grievance upheld, grievance dismissed, and upheld with circumstances noted. Localized counts, rounded proportions, and the total are visible before and after participation. New records begin with real zero counts; the product never seeds fictional responses. Consultation remains visibly advisory and cannot alter the immutable Bureau determination.

On first submission, the browser creates a random 256-bit participation key scoped to that public record and stores it in a versioned local envelope. The server retains only its SHA-256 digest, the selected position, and a timestamp. A PostgreSQL uniqueness constraint permits one immutable position for each record and participation digest. Replaying the same key is idempotent and returns its established position even if a different position is requested.

The browser key discourages ordinary repeat participation without an account, IP retention, fingerprint, or CAPTCHA. Clearing browser storage or racing isolated browser contexts can bypass it; this limitation is explicit and proportionate for the temporary, low-stakes experience. Broader coarse rate limiting belongs to the later access and cost-control capability.

Each accepted response is a durable row rather than an incremented counter. Submission and aggregate retrieval share one transaction, while aggregate queries derive exact counts from stored rows. A response is accepted only when the parent record is published and unexpired. Owner or Bureau unpublishing and expiry hide consultation and reject new responses without destroying retained aggregates. Owner restoration reveals the existing result; hard deletion cascades to all responses.

Successful submission updates the aggregate through one restrained transition. Failure preserves the selected position for an exact retry, and reduced-motion presentation updates immediately.

## Consequences

- Consultation is usable without registration and stores no raw case content or reusable cross-record visitor identity.
- Results are honest public aggregates rather than statistically controlled polling, and the product makes no stronger uniqueness claim than its mechanism provides.
- Database constraints and transactions prevent lost responses and mutable same-key votes under concurrency.
- Temporary lifecycle changes preserve public participation consistently with the retained determination record.
- The consultation consumes no generative credit and cannot influence assessment, language, remedy, or public-record content.

## Open considerations

Global and network rate limits, analytics, automated abuse signals, accounts, successor identity, deployment tuning, and any future retention change remain later decisions.
