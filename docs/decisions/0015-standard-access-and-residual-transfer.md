# 0015 — Standard access and residual-credit transfer

## Status

Accepted.

## Context

Standard access needs a deliberately small paid-generation allowance and one successor action without accounts. Giving every successor a fresh allowance would limit immediate branching but could mint credits indefinitely along a linear chain. Retaining both the former and new holder against one balance would bound cost but would no longer represent giving another person the turn.

Deterministic fallback must remain a complete official service when paid generation is absent. It must not accidentally make an unchanged five-credit authorization transferable through an unlimited number of people.

## Decision

An operator-created 256-bit standard authorization travels in a URL fragment, expires after 30 days, and may create one anonymous entitlement only once. The entitlement has exactly five provider-generation credits and a fixed 180-day lifetime. Claim exchanges the fragment for a digest-backed `HttpOnly`, `SameSite=Lax` browser session; persistence retains no raw access credential.

A provider-backed determination consumes one credit and qualifies the current holder to transfer the remaining allowance. Deterministic fallback and terminal internal failure consume no credit and do not qualify that tenure for transfer. They remain complete official outcomes and never strand a filing.

Successor authorization transfers the existing entitlement rather than creating another. Issuance is explicit and moves the current tenure into a pending state, suspending its paid use while the exact residual balance is reserved. One 30-day fragment invitation may be active, capped by the entitlement expiry. Before claim, the holder may cancel it or replace a lost link; replacement invalidates the former token, and expiry restores the holder. Claim atomically ends the former tenure, creates one new exclusive tenure and session over the same credit counters, and cannot be reversed.

Every new holder must consume a provider credit before another transfer. The entitlement expiry never resets. Consequently, a five-credit authorization can support at most five paid determinations and five qualifying holders when each uses one credit before transferring. It cannot branch into simultaneous paid holders or create additional credits.

Standard generation uses the existing server-owned filing idempotency, atomic reservation, refund, rate-limit, global dispatch budget, alert, and generation kill-switch controls. A separate durable switch can stop successor issuance without stopping filing or deterministic fallback. Evaluation access remains a separate forwardable, multi-session 100-credit pool.

## Consequences

- “Give someone a turn” is a transfer of authority and balance, not a referral reward.
- A pending invitation deliberately pauses the sender's paid use; cancel or expiry recovers it.
- The previous holder may continue using deterministic filing after transfer but cannot spend the transferred pool.
- Provider unavailability cannot consume credit, but it also cannot extend the number of holders in the paid chain.
- Access, invitation, and generation ledgers contain categorical accounting metadata only; public records and sharing payloads never receive private credentials.
- Losing the anonymous browser session after claim is unrecoverable in this account-free release. An unclaimed invitation can be replaced by its current holder.

## Open considerations

Accounts, payments, entitlement replenishment, cross-device session recovery, operator-led entitlement recovery, and any non-evaluation shared standard pool remain outside this capability.
