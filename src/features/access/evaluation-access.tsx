"use client";

import { useEffect, useState } from "react";

import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

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
  exchangeToken: (token: unknown) => Promise<ExchangeResult>;
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
    const token = window.location.hash.slice(1);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    if (!token) {
      const timer = window.setTimeout(() => {
        setState("invalid");
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }
    void exchangeToken(token)
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
    return undefined;
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
          <span className="access-mark" aria-hidden="true">
            {state === "exchanging" ? "B" : "!"}
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
