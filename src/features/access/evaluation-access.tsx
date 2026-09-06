"use client";

import { useEffect, useState } from "react";

import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import { currentAnalyticsJourneyId } from "../observability/browser-product-analytics";

import { CivicSeal } from "../application-shell/application-shell";

type ExchangeResult =
  | { status: "accepted" }
  | {
      status: "invalid" | "expired" | "revoked" | "limited" | "unavailable";
    };

interface EvaluationAccessProps {
  locale: InterfaceLocale;
  copy: MessageCatalog["Access"];
  navigation: MessageCatalog["Navigation"];
  exchangeToken: (
    token: unknown,
    journeyId?: unknown,
  ) => Promise<ExchangeResult>;
}

type AccessState = "exchanging" | Exclude<ExchangeResult["status"], "accepted">;

export function EvaluationAccess({
  locale,
  copy,
  navigation,
  exchangeToken,
}: EvaluationAccessProps) {
  const [state, setState] = useState<AccessState>("exchanging");

  useEffect(() => {
    let invalidTimer: number | undefined;
    const exchangeCurrentFragment = () => {
      if (invalidTimer !== undefined) window.clearTimeout(invalidTimer);
      const token = window.location.hash.slice(1);
      if (!token) {
        invalidTimer = window.setTimeout(() => {
          setState("invalid");
        }, 0);
        return;
      }
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      setState("exchanging");
      const journeyId = currentAnalyticsJourneyId();
      const exchange = journeyId
        ? exchangeToken(token, journeyId)
        : exchangeToken(token);
      void exchange
        .then((result) => {
          if (result.status === "accepted") {
            window.location.replace(
              `/${locale}/file/respondent?notice=evaluation-access`,
            );
            return;
          }
          setState(result.status);
        })
        .catch(() => {
          setState("unavailable");
        });
    };

    exchangeCurrentFragment();
    window.addEventListener("hashchange", exchangeCurrentFragment);
    return () => {
      if (invalidTimer !== undefined) window.clearTimeout(invalidTimer);
      window.removeEventListener("hashchange", exchangeCurrentFragment);
    };
  }, [exchangeToken, locale]);

  const content = accessContent(state, copy);
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
        <section
          className="access-card"
          aria-live="polite"
          aria-busy={state === "exchanging"}
        >
          <span
            className={`access-mark${state === "exchanging" ? " access-mark-seal" : ""}`}
            aria-hidden="true"
          >
            {state === "exchanging" ? (
              <CivicSeal initial={navigation.brandInitial} />
            ) : (
              "!"
            )}
          </span>
          <p className="eyebrow">{content.kicker}</p>
          <h1>{content.title}</h1>
          <p>{content.body}</p>
          {state === "exchanging" ? null : (
            <a className="button button-primary" href={`/${locale}`}>
              {copy.returnAction}
            </a>
          )}
        </section>
      </main>
    </div>
  );
}

function accessContent(
  state: AccessState,
  copy: MessageCatalog["Access"],
): { kicker: string; title: string; body: string } {
  if (state === "exchanging") {
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
  return {
    kicker: copy.invalidKicker,
    title: copy.invalidTitle,
    body:
      state === "expired"
        ? copy.expiredBody
        : state === "revoked"
          ? copy.revokedBody
          : copy.invalidBody,
  };
}
