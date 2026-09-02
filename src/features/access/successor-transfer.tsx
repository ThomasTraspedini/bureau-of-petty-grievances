"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { StandardAccessSummary } from "@/domain/access/standard-access";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import { currentAnalyticsJourneyId } from "../observability/browser-product-analytics";

const INVITATION_STORAGE_KEY = "bpg:successor-invitation:v1";

type Copy = MessageCatalog["StandardAccess"];

type IssueResult =
  | {
      status: "issued";
      invitationUrl: string;
      summary: StandardAccessSummary;
    }
  | {
      status:
        | "invalid"
        | "expired"
        | "transferred"
        | "not_eligible"
        | "exhausted"
        | "pending"
        | "disabled"
        | "unavailable";
    };

type CancelResult =
  | { status: "cancelled"; summary: StandardAccessSummary }
  | {
      status:
        "invalid" | "expired" | "transferred" | "not_pending" | "unavailable";
    };

export function SuccessorTransfer({
  locale,
  copy,
  summary,
  issueInvitation,
  cancelInvitation,
  onSummaryChange,
}: {
  locale: InterfaceLocale;
  copy: Copy;
  summary: StandardAccessSummary;
  issueInvitation: (
    locale: InterfaceLocale,
    replace: boolean,
    journeyId?: unknown,
  ) => Promise<IssueResult>;
  cancelInvitation: (journeyId?: unknown) => Promise<CancelResult>;
  onSummaryChange?: (summary: StandardAccessSummary) => void;
}) {
  const [current, setCurrent] = useState(summary);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [feedback, setFeedback] = useState<
    "idle" | "copied" | "failure" | "disabled" | "transferred"
  >("idle");
  const [isPending, startTransition] = useTransition();
  const addressRef = useRef<HTMLInputElement>(null);
  const initialTransferPending = useRef(summary.status === "transfer_pending");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored =
        window.sessionStorage.getItem(INVITATION_STORAGE_KEY) ?? "";
      if (initialTransferPending.current) {
        setInvitationUrl(stored);
      } else {
        setInvitationUrl((currentUrl) => {
          if (!currentUrl) {
            window.sessionStorage.removeItem(INVITATION_STORAGE_KEY);
          }
          return currentUrl;
        });
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function updateSummary(next: StandardAccessSummary) {
    setCurrent(next);
    onSummaryChange?.(next);
  }

  function issue(replace: boolean) {
    setFeedback("idle");
    startTransition(async () => {
      const journeyId = currentAnalyticsJourneyId();
      const result = journeyId
        ? await issueInvitation(locale, replace, journeyId)
        : await issueInvitation(locale, replace);
      if (result.status === "issued") {
        window.sessionStorage.setItem(
          INVITATION_STORAGE_KEY,
          result.invitationUrl,
        );
        setInvitationUrl(result.invitationUrl);
        updateSummary(result.summary);
      } else if (result.status === "disabled") {
        setFeedback("disabled");
      } else if (result.status === "transferred") {
        setFeedback("transferred");
      } else {
        setFeedback("failure");
      }
    });
  }

  function cancel() {
    setFeedback("idle");
    startTransition(async () => {
      const journeyId = currentAnalyticsJourneyId();
      const result = journeyId
        ? await cancelInvitation(journeyId)
        : await cancelInvitation();
      if (result.status === "cancelled") {
        window.sessionStorage.removeItem(INVITATION_STORAGE_KEY);
        setInvitationUrl("");
        updateSummary(result.summary);
      } else if (result.status === "transferred") {
        setFeedback("transferred");
      } else {
        setFeedback("failure");
      }
    });
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setFeedback("copied");
    } catch {
      addressRef.current?.focus();
      addressRef.current?.select();
      setFeedback("failure");
    }
  }

  const pending = current.status === "transfer_pending";
  const exhausted = current.status === "exhausted";
  return (
    <section className="successor-panel" aria-labelledby="successor-title">
      <p className="eyebrow">{copy.successorKicker}</p>
      <h2 id="successor-title">{copy.successorTitle}</h2>
      <p>{copy.successorBody}</p>
      <div className="successor-balance">
        <span>{copy.balanceLabel}</span>
        <strong>
          {format(copy.balanceValue, { count: current.creditsRemaining })}
        </strong>
      </div>

      {exhausted ? (
        <StatusCopy
          title={copy.successorExhaustedTitle}
          body={copy.successorExhaustedBody}
        />
      ) : pending ? (
        <>
          <StatusCopy
            title={copy.successorPendingTitle}
            body={copy.successorPendingBody}
          />
          {invitationUrl ? (
            <label className="successor-address-label">
              {copy.successorAddressLabel}
              <input
                ref={addressRef}
                readOnly
                value={invitationUrl}
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
              />
            </label>
          ) : null}
          {current.invitationExpiresAt ? (
            <p className="procedural-meta">
              {format(copy.successorExpiredHint, {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                }).format(new Date(current.invitationExpiresAt)),
              })}
            </p>
          ) : null}
          <div className="filing-actions">
            {invitationUrl ? (
              <button
                className="button button-primary"
                type="button"
                disabled={isPending}
                onClick={() => void copyInvitation()}
              >
                {feedback === "copied"
                  ? copy.successorCopied
                  : copy.successorCopyAction}
              </button>
            ) : null}
            <button
              className="button button-secondary"
              type="button"
              disabled={isPending}
              onClick={() => {
                issue(true);
              }}
            >
              {copy.successorReplaceAction}
            </button>
            <button
              className="text-action"
              type="button"
              disabled={isPending}
              onClick={cancel}
            >
              {copy.successorCancelAction}
            </button>
          </div>
        </>
      ) : current.transferEligible ? (
        <>
          <StatusCopy
            title={copy.successorAvailableTitle}
            body={copy.successorAvailableBody}
          />
          <button
            className="button button-primary"
            type="button"
            disabled={isPending}
            onClick={() => {
              issue(false);
            }}
          >
            {copy.successorIssueAction}
          </button>
        </>
      ) : (
        <StatusCopy
          title={copy.successorLockedTitle}
          body={copy.successorLockedBody}
        />
      )}
      {feedback === "failure" ? (
        <p className="form-error" role="alert">
          {copy.successorFailure}
        </p>
      ) : feedback === "disabled" ? (
        <p className="form-error" role="status">
          {copy.successorDisabled}
        </p>
      ) : feedback === "transferred" ? (
        <p className="form-error" role="status">
          {copy.successorTransferred}
        </p>
      ) : null}
    </section>
  );
}

function StatusCopy({ title, body }: { title: string; body: string }) {
  return (
    <div className="successor-status">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([^}]+)\}/gu, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  );
}
