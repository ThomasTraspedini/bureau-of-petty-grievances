# Product analytics

## Purpose and limits

The analytics contract exists to support short production loops: release, observe, identify a weak or promising part of the journey, form a hypothesis, change one coherent behavior, and compare the next release. It can answer what happened, where, how often, how long it took, and which product branch was rendered. It cannot establish why a person acted, prove causality, or turn small samples into statistically meaningful conclusions.

The instrumentation is deliberately content-free. It never collects filing answers, aliases, relationship details, witness statements, prompts, generated determination prose, bearer credentials, raw public-record identifiers, full URLs, referrers, IP addresses, or arbitrary metadata. Autocapture, session replay, heatmaps, advertising identity, and browser-side analytics SDKs are not used.

## Identity and retention

The browser creates one random `jrn_` identifier in `sessionStorage`. It connects events only within the current tab and is not a person identifier, cookie, account, fingerprint, or cross-device identity. Closing the tab ends that correlation boundary.

Public-record and successor-invitation analysis uses separate `sub_` pseudonyms derived server-side with keyed HMAC and purpose separation. Source identifiers and credentials cannot be recovered from the pseudonym or joined across purposes. Rotate the HMAC secret only when breaking historical subject correlation is acceptable.

Production events have a 180-day provider retention limit. The application stores no second analytics event ledger. Identifier-free aggregate release summaries may be retained for longer comparison, but must not include journey or subject identifiers. The deployment operator must configure and verify the same retention in Mixpanel.

## Event catalog

Every event carries schema version, event ID, occurrence time, locale, department, optional journey ID, application version, and deployment environment. Schema version `3` adds the Domestic Affairs evidence step and path codes while retaining the content-free envelope. Only the following event-specific fields are accepted:

| Event | Meaning | Allowed analysis fields |
| --- | --- | --- |
| `landing_viewed` | Localized landing rendered | entry surface |
| `example_opened` | Example determination link selected | none |
| `filing_started` | First filing step rendered | entry surface |
| `filing_step_viewed` | A validated filing route rendered | step, optional path code |
| `filing_step_completed` | A step advanced or a review correction began | step, direction, duration, optional path code |
| `filing_validation_failed` | A bounded client validation category appeared | step, categorical reason |
| `filing_completion_requested` | A valid reviewed path requested completion | path code |
| `determination_completed` | Server completion reached provider, fallback, rejection, limit, or failure | outcome, access kind, duration, path, attempts, fallback reason, tokens, estimated cost, price version, model |
| `determination_viewed` | A validated tab snapshot rendered | restored flag |
| `public_record_published` | Publication completed or failed | outcome, created flag, optional record pseudonym |
| `public_record_viewed` | An available public record rendered | record pseudonym, entry surface |
| `share_completed` | Native share, copy, or manual fallback resolved | record pseudonym, method, outcome |
| `consultation_submitted` | A public consultation attempt resolved | record pseudonym, outcome, optional position |
| `report_submitted` | A categorical report attempt resolved | record pseudonym, outcome, optional reason |
| `access_redeemed` | Evaluation, standard, or successor access exchange resolved | kind, categorical outcome, optional invitation pseudonym |
| `successor_invitation_changed` | Invitation issue, replace, cancel, or claim resolved | action, outcome, optional invitation pseudonym |
| `owner_record_changed` | Owner unpublish, restore, or delete resolved | action, outcome, record pseudonym |
| `operational_failure` | A content-free operational category occurred | operation, category |

Path codes name product logic, not submitted values: the three Chronology codes, three Digital Conduct codes, and `domestic_affairs_token_remainder`, `domestic_affairs_misplaced_object`, or `domestic_affairs_empty_packaging`. Steps may identify `department` or the department-specific `chronology`, `communications`, and `domestic_evidence` phases. No event carries selected quantities, distances, durations, effort, recurrence, room names, witness text, or communication content. Entry surfaces are coarse categories only: direct, internal, external, share, evaluation, standard, or successor.

## Required analyses

Create the following Mixpanel reports from the versioned definitions in `src/domain/observability/analysis-catalog.ts`. Keep their names stable so release comparisons remain legible.

### Primary journey funnel

Order `landing_viewed` → `filing_started` → `filing_completion_requested` → `determination_completed` → `determination_viewed` → `public_record_published` → `share_completed`. Break down by `application_version`, `entry_surface`, and `access_kind`; compare conversion and time-to-convert. Both `accepted_provider` and `accepted_fallback` are successful determination outcomes.

Use this funnel to locate a weak stage, then inspect the narrower report for that stage. Do not treat the full funnel as unique-person conversion: the unit is a tab-scoped journey.

### Filing path and drop-off

Use `filing_step_viewed`, `filing_step_completed`, and `filing_validation_failed`. Break down by department, step, path code, direction, and reason. Compare step-to-step conversion, completion duration, corrections from review, and validation pressure. This reveals which enabled department path is selected and where each path loses momentum without exposing any answer value.

### Generation health and cost

Use `determination_completed`. Monitor provider versus fallback completion, rejection, limiting, and failure; p50 and p95 duration; provider attempts; token counts; and the sum of `estimated_cost_microusd`. Break down by application version, access kind, model, fallback reason, and pricing version. Never combine cost values across pricing versions without preserving that distinction.

### Shared-record engagement

Use `share_completed`, `public_record_viewed`, `consultation_submitted`, and `report_submitted`. Compare share methods and failures, share-attributed record views, view-to-consultation conversion, positions, and categorical safety reports. `record_subject` supports aggregate record-level engagement; it is not an owner or visitor identity.

### Successor propagation

Use `successor_invitation_changed`, `access_redeemed`, `filing_started`, and `determination_completed`. Measure issue-to-claim conversion with the invitation pseudonym, then evaluate later filing completion at the journey level. Do not attempt to construct a persistent social graph.

### Operational reliability

Use categorical outcomes across access, completion, publication, consultation, reports, owner actions, and operational failures. Compare by release and environment. Existing budget alerts remain the only notification mechanism; analytics is for diagnosis and trend review, not paging.

## Release learning loop

Before a production release, confirm the application version and pricing snapshot, annotate the release time in Mixpanel, and record the intended product hypothesis outside event properties. After enough real traffic has accumulated:

1. compare the same analysis before and after the release, excluding development and test environments;
2. check total volume and missing-event discontinuities before interpreting conversion;
3. segment only on declared categorical fields and avoid small-cell conclusions;
4. pair unexpected movement with direct qualitative evidence when possible;
5. make one bounded product change and preserve the prior report definition.

A change in conversion is evidence for further investigation, not proof that the release caused it. Provider outages, traffic-source mix, access availability, and low volume can all move the same metric.

## Deployment

Analytics is off by default. To enable it, configure all variables shown in `.env.example`, including the Mixpanel project token, EU or US region, a separate random HMAC secret of at least 32 characters, retention assertion, semantic application version, and versioned input/output prices expressed as integer micro-US-dollars per million tokens.

The project token remains server-side because browsers send only to `/api/observability`. The collector accepts small same-origin JSON requests, validates the exact event contract, and returns no event data. The Mixpanel adapter sends with `ip=0`, uses the selected regional ingestion host, and fails after a short bounded wait. Product behavior continues unchanged if collection or delivery fails.

Before enabling production collection:

- set Mixpanel data retention to 180 days and confirm deletion behavior;
- select the correct EU or US project and matching ingestion region;
- keep geolocation enrichment disabled and verify incoming events do not retain IP-derived properties;
- keep autocapture and session replay disabled;
- restrict project access and do not place service-account secrets in application variables;
- verify the localized disclosure is visible and the consumer journey remains usable with Mixpanel blocked;
- run `npm run analytics:operate -- status` and resolve any incomplete configuration.

The status command prints only categorical configuration state, versions, region, retention, and whether required secrets are present. It never prints secrets. Configuration changes require a new deployment; report definitions and provider retention remain operator-owned Mixpanel settings.

## Data-quality checks

At least once per release, confirm:

- only the current schema and expected application version appear in production;
- landing, filing-start, completion-request, completion, and determination-view counts have plausible ordering;
- no unknown property exists and no value resembles case prose, a credential, URL, raw record ID, or network address;
- provider attempt and token totals reconcile directionally with provider billing and the server's hard attempt budget;
- share-attributed views use `entry_surface=share` and never carry the shared URL;
- development and test events are excluded from product decisions;
- event age does not exceed 180 days.

If prohibited data is discovered, disable analytics immediately, preserve no export of the affected events, delete them through the provider's supported procedure, rotate the analytics HMAC secret if source correlation may be compromised, and document the correction before re-enabling collection.
