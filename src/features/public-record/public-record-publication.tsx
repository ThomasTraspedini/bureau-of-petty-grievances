"use client";

import { useRef, useState } from "react";

import { publishPublicRecord } from "@/app/[locale]/record/actions";
import type { ChronologyDeterminationSnapshot } from "@/domain/determination/determination-experience";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import { currentAnalyticsJourneyId } from "../observability/browser-product-analytics";

type PublicRecordCopy = MessageCatalog["PublicRecord"];

export function PublicRecordPublication({
  snapshot,
  locale,
  copy,
}: {
  snapshot: ChronologyDeterminationSnapshot;
  locale: InterfaceLocale;
  copy: PublicRecordCopy;
}) {
  const [consented, setConsented] = useState(false);
  const pendingPublication = useRef<{
    publicationKey: string;
    ownerCredential: string;
  } | null>(null);
  const [state, setState] = useState<
    | { status: "idle" | "publishing" | "failed" }
    | {
        status: "published";
        publicAddress: string;
        ownerAddress: string;
        expiresAt: string;
      }
  >({ status: "idle" });

  async function publish() {
    if (!consented || state.status === "publishing") return;
    pendingPublication.current ??= {
      publicationKey: randomToken("pub", 16),
      ownerCredential: randomToken("own", 32),
    };
    const { publicationKey, ownerCredential } = pendingPublication.current;
    setState({ status: "publishing" });
    let result;
    try {
      const input = {
        snapshot,
        publicationKey,
        ownerCredential,
      };
      const journeyId = currentAnalyticsJourneyId();
      result = journeyId
        ? await publishPublicRecord(locale, input, journeyId)
        : await publishPublicRecord(locale, input);
    } catch {
      setState({ status: "failed" });
      return;
    }
    if (result.status !== "published") {
      setState({ status: "failed" });
      return;
    }
    const publicPath = `/${locale}/record/${result.publicId}`;
    const ownerPath = `${publicPath}/manage#owner=${ownerCredential}`;
    window.sessionStorage.setItem(
      ownerSessionKey(result.publicId),
      ownerCredential,
    );
    setState({
      status: "published",
      publicAddress: new URL(publicPath, window.location.origin).toString(),
      ownerAddress: new URL(ownerPath, window.location.origin).toString(),
      expiresAt: result.expiresAt,
    });
  }

  return (
    <section className="public-record-panel" aria-labelledby="publish-title">
      <p className="eyebrow">{copy.publicationKicker}</p>
      <h2 id="publish-title">{copy.publicationTitle}</h2>
      <p>{copy.publicationBody}</p>
      {state.status === "published" ? (
        <div className="public-record-success" role="status">
          <h3>{copy.publicationSuccessTitle}</h3>
          <p>{copy.publicationSuccessBody}</p>
          <dl>
            <div>
              <dt>{copy.publicAddressLabel}</dt>
              <dd>{state.publicAddress}</dd>
            </div>
            <div>
              <dt>{copy.ownerAddressLabel}</dt>
              <dd>{state.ownerAddress}</dd>
            </div>
          </dl>
          <p>
            {format(copy.expiryNotice, {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: "long",
              }).format(new Date(state.expiresAt)),
            })}
          </p>
          <div className="determination-actions">
            <a className="button button-primary" href={state.publicAddress}>
              {copy.openPublicAction}
            </a>
            <a className="button button-secondary" href={state.ownerAddress}>
              {copy.openOwnerAction}
            </a>
          </div>
        </div>
      ) : (
        <>
          <label className="publication-consent">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => {
                setConsented(event.target.checked);
              }}
            />
            <span>{copy.publicationConsent}</span>
          </label>
          {state.status === "failed" ? (
            <div className="public-record-error" role="alert">
              <strong>{copy.publicationFailureTitle}</strong>
              <p>{copy.publicationFailureBody}</p>
            </div>
          ) : null}
          <button
            className="button button-primary"
            type="button"
            disabled={!consented || state.status === "publishing"}
            onClick={() => void publish()}
          >
            {state.status === "publishing"
              ? copy.publishing
              : copy.publishAction}
          </button>
        </>
      )}
    </section>
  );
}

export function ownerSessionKey(publicId: string): string {
  return `bpg:record-owner:${publicId}:v1`;
}

function randomToken(
  prefix: "pub" | "own" | "rpt",
  byteLength: number,
): string {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${prefix}_${window
    .btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "")}`;
}

export function createReportKey(): string {
  return randomToken("rpt", 16);
}

function format(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{([^}]+)\}/gu,
    (match, name: string) => values[name] ?? match,
  );
}
