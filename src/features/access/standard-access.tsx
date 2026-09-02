"use client";

import { useEffect, useState } from "react";

import type { StandardAccessSummary } from "@/domain/access/standard-access";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import { currentAnalyticsJourneyId } from "../observability/browser-product-analytics";

import { CivicSeal } from "../application-shell/application-shell";
import { SuccessorTransfer } from "./successor-transfer";

type ExchangeState =
  | "checking"
  | "invalid"
  | "expired"
  | "claimed"
  | "revoked"
  | "limited"
  | "unavailable"
  | "transferred";

type StatusResult =
  | { status: "available"; summary: StandardAccessSummary }
  | {
      status: "invalid" | "expired" | "transferred" | "revoked" | "unavailable";
    };

export function StandardAccess({
  locale,
  copy,
  navigation,
  exchangeToken,
  getStatus,
  issueInvitation,
  cancelInvitation,
}: {
  locale: InterfaceLocale;
  copy: MessageCatalog["StandardAccess"];
  navigation: MessageCatalog["Navigation"];
  exchangeToken: (
    token: unknown,
    journeyId?: unknown,
  ) => Promise<
    | { status: "accepted"; summary: StandardAccessSummary }
    | {
        status:
          | "invalid"
          | "expired"
          | "claimed"
          | "revoked"
          | "limited"
          | "unavailable";
      }
  >;
  getStatus: () => Promise<StatusResult>;
  issueInvitation: Parameters<typeof SuccessorTransfer>[0]["issueInvitation"];
  cancelInvitation: Parameters<typeof SuccessorTransfer>[0]["cancelInvitation"];
}) {
  const [state, setState] = useState<ExchangeState>("checking");
  const [summary, setSummary] = useState<StandardAccessSummary | null>(null);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    const journeyId = currentAnalyticsJourneyId();
    const operation = token
      ? journeyId
        ? exchangeToken(token, journeyId)
        : exchangeToken(token)
      : getStatus();
    void operation
      .then((result) => {
        if (result.status === "accepted" || result.status === "available") {
          setSummary(result.summary);
          return;
        }
        setState(result.status);
      })
      .catch(() => {
        setState("unavailable");
      });
  }, [exchangeToken, getStatus]);

  const content = summary ? null : stateContent(state, copy);
  return (
    <div className="access-shell" data-locale={locale}>
      <header className="filing-header">
        <a
          className="brand"
          href={`/${locale}`}
          aria-label={navigation.brandName}
        >
          <CivicSeal initial={navigation.brandInitial} />
          <span>
            <strong>{navigation.brandName}</strong>
            <small>{navigation.brandDescriptor}</small>
          </span>
        </a>
        <span className="filing-service-name">{copy.serviceName}</span>
      </header>
      <main className="access-main">
        {summary ? (
          <div className="standard-access-stack">
            <section
              className="access-card access-card-standard"
              aria-live="polite"
            >
              <span className="access-mark" aria-hidden="true">
                B
              </span>
              <p className="eyebrow">{copy.activeKicker}</p>
              <h1>{copy.activeTitle}</h1>
              <p>{copy.activeBody}</p>
              <dl className="access-balance">
                <div>
                  <dt>{copy.balanceLabel}</dt>
                  <dd>
                    {format(copy.balanceValue, {
                      count: summary.creditsRemaining,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>{copy.expiryLabel}</dt>
                  <dd>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(summary.expiresAt))}
                  </dd>
                </div>
              </dl>
              <a
                className="button button-primary"
                href={`/${locale}/file/respondent`}
              >
                {copy.beginAction}
              </a>
            </section>
            <SuccessorTransfer
              locale={locale}
              copy={copy}
              summary={summary}
              issueInvitation={issueInvitation}
              cancelInvitation={cancelInvitation}
              onSummaryChange={setSummary}
            />
          </div>
        ) : (
          <section
            className="access-card"
            aria-live="polite"
            aria-busy={state === "checking"}
          >
            <span className="access-mark" aria-hidden="true">
              {state === "checking" ? "B" : "!"}
            </span>
            <p className="eyebrow">{content?.kicker}</p>
            <h1>{content?.title}</h1>
            <p>{content?.body}</p>
            {state === "checking" ? null : (
              <a className="button button-primary" href={`/${locale}`}>
                {copy.returnAction}
              </a>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function stateContent(
  state: ExchangeState,
  copy: MessageCatalog["StandardAccess"],
) {
  if (state === "checking") {
    return {
      kicker: copy.processingKicker,
      title: copy.processingTitle,
      body: copy.processingBody,
    };
  }
  if (state === "limited") {
    return {
      kicker: copy.limitedKicker,
      title: copy.limitedTitle,
      body: copy.limitedBody,
    };
  }
  if (state === "unavailable") {
    return {
      kicker: copy.unavailableKicker,
      title: copy.unavailableTitle,
      body: copy.unavailableBody,
    };
  }
  if (state === "transferred") {
    return {
      kicker: copy.transferredKicker,
      title: copy.transferredTitle,
      body: copy.transferredBody,
    };
  }
  return {
    kicker: copy.invalidKicker,
    title: copy.invalidTitle,
    body:
      state === "expired"
        ? copy.expiredBody
        : state === "claimed"
          ? copy.claimedBody
          : state === "revoked"
            ? copy.revokedBody
            : copy.invalidBody,
  };
}

function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([^}]+)\}/gu, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  );
}
