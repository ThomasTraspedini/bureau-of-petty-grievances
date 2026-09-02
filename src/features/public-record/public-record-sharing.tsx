"use client";

import { useRef, useState } from "react";

import type { PublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";

import type {
  LocalizedPublicRecordShare,
  PublicRecordSharingCopy,
} from "./public-record-sharing-copy";

type SharingStatus = "idle" | "shared" | "cancelled" | "copied" | "manual";

export function PublicRecordSharing({
  descriptor,
  localized,
  publicUrl,
  copy,
}: {
  descriptor: PublicRecordShareDescriptor;
  localized: LocalizedPublicRecordShare;
  publicUrl: string;
  copy: PublicRecordSharingCopy;
}) {
  const address = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SharingStatus>("idle");

  async function copyPublicAddress() {
    try {
      const clipboard: unknown = Reflect.get(navigator, "clipboard");
      if (!isClipboard(clipboard)) throw new Error("unavailable");
      await clipboard.writeText(publicUrl);
      setStatus("copied");
    } catch {
      setStatus("manual");
      address.current?.focus();
      address.current?.select();
    }
  }

  async function sharePublicRecord() {
    if (typeof navigator.share !== "function") {
      await copyPublicAddress();
      return;
    }
    try {
      await navigator.share({
        title: localized.title,
        text: localized.shareText,
        url: publicUrl,
      });
      setStatus("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("cancelled");
        return;
      }
      await copyPublicAddress();
    }
  }

  return (
    <section
      className="public-record-panel sharing-panel"
      aria-labelledby="sharing-title"
    >
      <p className="eyebrow">{copy.panelKicker}</p>
      <h2 id="sharing-title">{copy.panelTitle}</h2>
      <p>{copy.panelBody}</p>

      <article
        className="share-object"
        data-variant={descriptor.presentationVariant}
        aria-label={copy.previewLabel}
      >
        <div className="share-object-mark" aria-hidden="true">
          <span>{localized.brandInitial}</span>
        </div>
        <div className="share-object-copy">
          <span>{copy.previewLabel}</span>
          <p>{localized.department}</p>
          <h3>{localized.offence}</h3>
          <strong>{localized.disposition}</strong>
          <p>{localized.summary}</p>
          <small>{localized.reference}</small>
        </div>
      </article>

      <label className="share-address-label" htmlFor="public-share-address">
        {copy.publicAddressLabel}
      </label>
      <input
        ref={address}
        className="share-address"
        id="public-share-address"
        value={publicUrl}
        readOnly
        onFocus={(event) => {
          event.currentTarget.select();
        }}
      />

      <div className="determination-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => void sharePublicRecord()}
        >
          {copy.shareAction}
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void copyPublicAddress()}
        >
          {copy.copyAction}
        </button>
      </div>

      <p className="share-privacy-note">{copy.privacyNote}</p>
      <p className="sharing-status" aria-live="polite">
        {statusMessage(status, copy)}
      </p>
    </section>
  );
}

function isClipboard(
  value: unknown,
): value is { writeText(text: string): Promise<void> } {
  if (typeof value !== "object" || value === null) return false;
  return typeof Reflect.get(value, "writeText") === "function";
}

function statusMessage(
  status: SharingStatus,
  copy: PublicRecordSharingCopy,
): string {
  switch (status) {
    case "idle":
      return "";
    case "shared":
      return copy.sharedStatus;
    case "cancelled":
      return copy.shareCancelledStatus;
    case "copied":
      return copy.copiedStatus;
    case "manual":
      return copy.manualStatus;
  }
}
