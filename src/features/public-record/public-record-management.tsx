"use client";

import { useEffect, useState } from "react";

import {
  applyOwnerRecordAction,
  loadOwnedPublicRecord,
} from "@/app/[locale]/record/actions";
import type {
  OwnerLifecycleAction,
  PublicRecord,
} from "@/domain/public-record/public-record";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { CivicSeal } from "../application-shell/application-shell";
import { DeterminationRecord } from "../determination/determination-record";
import { currentAnalyticsJourneyId } from "../observability/browser-product-analytics";
import { ownerSessionKey } from "./public-record-publication";

type ManagementState =
  | { status: "loading" | "unauthorized" | "unavailable" | "deleted" }
  | { status: "authorized"; record: PublicRecord; ownerCredential: string };

export function PublicRecordManagement({
  publicId,
  locale,
  messages,
}: {
  publicId: string;
  locale: InterfaceLocale;
  messages: MessageCatalog;
}) {
  const [state, setState] = useState<ManagementState>({ status: "loading" });
  const [changing, setChanging] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renderedAt] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fragmentCredential = fragment.get("owner");
    const ownerCredential =
      fragmentCredential ??
      window.sessionStorage.getItem(ownerSessionKey(publicId));
    if (fragmentCredential !== null) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (ownerCredential === null) {
      queueMicrotask(() => {
        if (active) setState({ status: "unauthorized" });
      });
      return () => {
        active = false;
      };
    }
    window.sessionStorage.setItem(ownerSessionKey(publicId), ownerCredential);
    void loadOwnedPublicRecord(publicId, ownerCredential)
      .then((result) => {
        if (!active) return;
        if (result.status === "authorized") {
          setState({
            status: "authorized",
            record: result.record,
            ownerCredential,
          });
        } else {
          window.sessionStorage.removeItem(ownerSessionKey(publicId));
          setState({ status: result.status });
        }
      })
      .catch(() => {
        if (!active) return;
        window.sessionStorage.removeItem(ownerSessionKey(publicId));
        setState({ status: "unavailable" });
      });
    return () => {
      active = false;
    };
  }, [publicId]);

  async function apply(action: OwnerLifecycleAction) {
    if (state.status !== "authorized" || changing) return;
    setChanging(true);
    setFailed(false);
    let result;
    try {
      const journeyId = currentAnalyticsJourneyId();
      result = journeyId
        ? await applyOwnerRecordAction(
            publicId,
            state.ownerCredential,
            action,
            journeyId,
          )
        : await applyOwnerRecordAction(publicId, state.ownerCredential, action);
    } catch {
      setChanging(false);
      setFailed(true);
      return;
    }
    setChanging(false);
    if (result.status === "deleted") {
      window.sessionStorage.removeItem(ownerSessionKey(publicId));
      setState({ status: "deleted" });
      return;
    }
    if (result.status === "updated") {
      setState({ ...state, record: result.record });
      setConfirmDelete(false);
      return;
    }
    setFailed(true);
  }

  if (state.status !== "authorized") {
    const deleted = state.status === "deleted";
    const loading = state.status === "loading";
    return (
      <main className="record-state-page">
        <CivicSeal initial={messages.Navigation.brandInitial} />
        {loading ? (
          <p role="status">{messages.PublicRecord.managementRestoring}</p>
        ) : (
          <>
            <p className="eyebrow">{messages.PublicRecord.managementKicker}</p>
            <h1>
              {deleted
                ? messages.PublicRecord.managementDeletedTitle
                : messages.PublicRecord.managementUnauthorizedTitle}
            </h1>
            <p>
              {deleted
                ? messages.PublicRecord.managementDeletedBody
                : messages.PublicRecord.managementUnauthorizedBody}
            </p>
            <a className="button button-primary" href={`/${locale}`}>
              {messages.PublicRecord.managementHomeAction}
            </a>
          </>
        )}
      </main>
    );
  }

  const copy = messages.PublicRecord;
  const expired = new Date(state.record.expiresAt).getTime() <= renderedAt;
  const statusLabel = expired
    ? copy.managementExpired
    : state.record.status === "published"
      ? copy.managementPublished
      : state.record.status === "owner_unpublished"
        ? copy.managementOwnerUnpublished
        : copy.managementBureauUnpublished;

  return (
    <DeterminationRecord
      snapshot={state.record.snapshot}
      locale={locale}
      copy={messages.Determination}
      navigation={messages.Navigation}
      sessionLabel={copy.managementSessionLabel}
      boundaryTitle={copy.managementTitle}
      boundaryBody={copy.managementBody}
      publicMetadata={{
        publishedAt: state.record.publishedAt,
        expiresAt: state.record.expiresAt,
        publishedLabel: copy.publishedLabel,
        expiresLabel: copy.expiresLabel,
      }}
      actions={
        <a
          className="button button-secondary"
          href={`/${locale}/record/${publicId}`}
        >
          {copy.openPublicAction}
        </a>
      }
      afterRecord={
        <section className="public-record-panel" aria-labelledby="manage-title">
          <p className="eyebrow">{copy.managementKicker}</p>
          <h2 id="manage-title">{copy.managementTitle}</h2>
          <p>{copy.managementBody}</p>
          <p className="record-status">
            <strong>{statusLabel}</strong>
          </p>
          {failed ? (
            <p className="public-record-error" role="alert">
              {copy.managementFailure}
            </p>
          ) : null}
          <div className="determination-actions">
            {state.record.status === "published" && !expired ? (
              <button
                className="button button-secondary"
                type="button"
                disabled={changing}
                onClick={() => void apply("unpublish")}
              >
                {copy.unpublishAction}
              </button>
            ) : state.record.status === "owner_unpublished" && !expired ? (
              <button
                className="button button-primary"
                type="button"
                disabled={changing}
                onClick={() => void apply("restore")}
              >
                {copy.restoreAction}
              </button>
            ) : null}
            {!confirmDelete ? (
              <button
                className="button button-danger"
                type="button"
                disabled={changing}
                onClick={() => {
                  setConfirmDelete(true);
                }}
              >
                {copy.deleteAction}
              </button>
            ) : (
              <div className="delete-confirmation" role="group">
                <p>{copy.deleteWarning}</p>
                <button
                  className="button button-danger"
                  type="button"
                  disabled={changing}
                  onClick={() => void apply("delete")}
                >
                  {copy.confirmDeleteAction}
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={changing}
                  onClick={() => {
                    setConfirmDelete(false);
                  }}
                >
                  {copy.cancelDeleteAction}
                </button>
              </div>
            )}
          </div>
        </section>
      }
    />
  );
}
