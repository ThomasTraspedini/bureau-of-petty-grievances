# 0024 — Completed filing restart semantics

## Status

Accepted.

## Context

Device-local draft recovery protects unfinished work, but treating a completed filing as perpetually in progress makes a deliberate new filing begin with the prior answers. Clearing the draft immediately on completion would solve that problem while breaking the determination's explicit review-and-correct path.

## Decision

Keep incomplete and completed filing intent distinct without persisting filing content anywhere new.

Successful completion writes a validated, locale-bound, content-free completion marker beside the existing device-local draft. The marker expires with the 30-day draft lifetime. The completed draft remains available when the filer follows the determination's review action or navigates within the filing journey.

Entering the opening filing step externally while a current completion marker is present means “start a new filing.” The client clears the completed draft, completion marker, transient determination, legacy equivalents, and then presents a blank filing without a recovery notice. Editing a reviewed completed filing clears the marker and determination, returning that work to the normal in-progress recovery lifecycle. Invalid or expired markers are discarded.

For filings completed before the marker existed, a still-valid transient determination supplies migration evidence only when its revalidated normalized filing exactly matches the revalidated device-local draft. A merely complete but unsubmitted review is never inferred to be completed.

## Consequences

- Abandoned or interrupted work continues to restore for 30 days.
- Review remains available after completion until the filer deliberately begins another filing.
- The Bureau home action behaves as a new filing after completion rather than as an accidental duplicate.
- The marker contains no alias, answers, witness prose, determination language, entitlement, or public-record authority.
- Starting a new filing intentionally retires the prior transient review state on that device; published records remain independent.
