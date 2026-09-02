"use client";

import { useEffect, useState } from "react";

import { submitPublicConsultation } from "@/app/[locale]/record/actions";
import {
  consultationCount,
  consultationPercentage,
  isPublicConsultationParticipationKey,
  isPublicConsultationPosition,
  PUBLIC_CONSULTATION_POSITIONS,
  type PublicConsultationAggregate,
  type PublicConsultationPosition,
} from "@/domain/public-record/public-consultation";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

type ConsultationCopy = MessageCatalog["Consultation"];
type SubmissionState =
  "idle" | "submitting" | "submitted" | "failed" | "unavailable";

interface ConsultationEnvelope {
  version: 1;
  publicId: string;
  participationKey: string;
  position: PublicConsultationPosition;
  submitted: boolean;
}

export function PublicRecordConsultation({
  publicId,
  locale,
  initialAggregate,
  copy,
}: {
  publicId: string;
  locale: InterfaceLocale;
  initialAggregate: PublicConsultationAggregate | null;
  copy: ConsultationCopy;
}) {
  const [aggregate, setAggregate] = useState(initialAggregate);
  const [selection, setSelection] = useState<PublicConsultationPosition | null>(
    null,
  );
  const [participationKey, setParticipationKey] = useState<string | null>(null);
  const [submissionState, setSubmissionState] =
    useState<SubmissionState>("idle");

  useEffect(() => {
    let stored: ConsultationEnvelope | null;
    try {
      const key = consultationStorageKey(publicId);
      stored = parseConsultationEnvelope(window.localStorage.getItem(key));
      if (stored?.publicId !== publicId) {
        window.localStorage.removeItem(key);
        stored = null;
      }
    } catch {
      stored = null;
    }
    if (stored === null) return;
    const recovered = stored;
    queueMicrotask(() => {
      setSelection(recovered.position);
      setParticipationKey(recovered.participationKey);
      setSubmissionState(recovered.submitted ? "submitted" : "failed");
    });
  }, [publicId]);

  async function submit(position: PublicConsultationPosition) {
    if (
      aggregate === null ||
      submissionState === "submitting" ||
      submissionState === "submitted" ||
      submissionState === "unavailable" ||
      (selection !== null && selection !== position)
    ) {
      return;
    }
    const key = resolveParticipationKey(publicId, participationKey);
    setSelection(position);
    setParticipationKey(key);
    setSubmissionState("submitting");
    storeConsultationEnvelope({
      version: 1,
      publicId,
      participationKey: key,
      position,
      submitted: false,
    });

    try {
      const result = await submitPublicConsultation(locale, {
        publicId,
        participationKey: key,
        position,
      });
      if (result.status === "unavailable") {
        setSubmissionState("unavailable");
        return;
      }
      if (result.status !== "accepted") {
        setSubmissionState("failed");
        return;
      }
      setAggregate(result.aggregate);
      setSelection(result.selectedPosition);
      setSubmissionState("submitted");
      storeConsultationEnvelope({
        version: 1,
        publicId,
        participationKey: key,
        position: result.selectedPosition,
        submitted: true,
      });
    } catch {
      setSubmissionState("failed");
    }
  }

  return (
    <section
      className="public-record-panel consultation-panel"
      aria-labelledby="consultation-title"
    >
      <p className="eyebrow">{copy.panelKicker}</p>
      <h2 id="consultation-title">{copy.panelTitle}</h2>
      <p>{copy.panelBody}</p>
      <p className="consultation-separation">
        <strong>{copy.officialBoundaryTitle}</strong>
        <span>{copy.officialBoundaryBody}</span>
      </p>

      {aggregate === null ? (
        <p className="public-record-error" role="alert">
          {copy.loadFailure}
        </p>
      ) : (
        <>
          <div className="consultation-summary" aria-live="polite">
            <strong>
              {formatResponseCount(aggregate.total, locale, copy)}
            </strong>
            <span>
              {aggregate.total === 0 ? copy.emptyState : copy.aggregateNote}
            </span>
          </div>
          <ul className="consultation-options">
            {PUBLIC_CONSULTATION_POSITIONS.map((position) => (
              <ConsultationOption
                key={position}
                position={position}
                aggregate={aggregate}
                locale={locale}
                copy={copy}
                selected={selection === position}
                disabled={
                  submissionState === "submitting" ||
                  submissionState === "submitted" ||
                  submissionState === "unavailable" ||
                  (selection !== null && selection !== position)
                }
                onSelect={() => void submit(position)}
              />
            ))}
          </ul>
          <p className="consultation-privacy">{copy.participationBoundary}</p>
          <p
            className={
              submissionState === "failed" || submissionState === "unavailable"
                ? "public-record-error"
                : "consultation-status"
            }
            role={submissionState === "failed" ? "alert" : "status"}
          >
            {submissionMessage(submissionState, copy)}
          </p>
        </>
      )}
    </section>
  );
}

function ConsultationOption({
  position,
  aggregate,
  locale,
  copy,
  selected,
  disabled,
  onSelect,
}: {
  position: PublicConsultationPosition;
  aggregate: PublicConsultationAggregate;
  locale: InterfaceLocale;
  copy: ConsultationCopy;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const count = consultationCount(aggregate, position);
  const percentage = consultationPercentage(count, aggregate.total);
  const label = positionLabel(position, copy);
  return (
    <li>
      <button
        className="consultation-option"
        type="button"
        data-selected={selected ? "true" : "false"}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        <span className="consultation-option-heading">
          <strong>{label}</strong>
          <span>{formatResponseCount(count, locale, copy)}</span>
        </span>
        <span className="consultation-meter" aria-hidden="true">
          <span style={{ width: `${String(percentage)}%` }} />
        </span>
        <span className="consultation-percentage">
          {format(copy.percentage, {
            percentage: new Intl.NumberFormat(locale).format(percentage),
          })}
        </span>
      </button>
    </li>
  );
}

export function consultationStorageKey(publicId: string): string {
  return `bpg:consultation:${publicId}:v1`;
}

export function parseConsultationEnvelope(
  value: string | null,
): ConsultationEnvelope | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || Object.keys(parsed).length !== 5) {
      return null;
    }
    const envelope = parsed;
    if (
      envelope.version !== 1 ||
      typeof envelope.publicId !== "string" ||
      !isPublicConsultationParticipationKey(envelope.participationKey) ||
      !isPublicConsultationPosition(envelope.position) ||
      typeof envelope.submitted !== "boolean"
    ) {
      return null;
    }
    return {
      version: 1,
      publicId: envelope.publicId,
      participationKey: envelope.participationKey,
      position: envelope.position,
      submitted: envelope.submitted,
    };
  } catch {
    return null;
  }
}

function storeConsultationEnvelope(envelope: ConsultationEnvelope): void {
  try {
    window.localStorage.setItem(
      consultationStorageKey(envelope.publicId),
      JSON.stringify(envelope),
    );
  } catch {
    // Server-side uniqueness still applies when device storage is unavailable.
  }
}

function createConsultationParticipationKey(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `cns_${window
    .btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "")}`;
}

function resolveParticipationKey(
  publicId: string,
  current: string | null,
): string {
  if (current !== null) return current;
  try {
    const stored = parseConsultationEnvelope(
      window.localStorage.getItem(consultationStorageKey(publicId)),
    );
    if (stored?.publicId === publicId) return stored.participationKey;
  } catch {
    // A fresh in-memory key still permits a privacy-preserving response.
  }
  return createConsultationParticipationKey();
}

function positionLabel(
  position: PublicConsultationPosition,
  copy: ConsultationCopy,
): string {
  switch (position) {
    case "grievance_upheld":
      return copy.positionUpheld;
    case "grievance_dismissed":
      return copy.positionDismissed;
    case "upheld_with_circumstances_noted":
      return copy.positionCircumstances;
  }
}

function formatResponseCount(
  count: number,
  locale: InterfaceLocale,
  copy: ConsultationCopy,
): string {
  return format(count === 1 ? copy.responseCountOne : copy.responseCountOther, {
    count: new Intl.NumberFormat(locale).format(count),
  });
}

function submissionMessage(
  state: SubmissionState,
  copy: ConsultationCopy,
): string {
  switch (state) {
    case "idle":
      return copy.selectionPrompt;
    case "submitting":
      return copy.submitting;
    case "submitted":
      return copy.submitted;
    case "failed":
      return copy.submitFailure;
    case "unavailable":
      return copy.unavailable;
  }
}

function format(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{([^}]+)\}/gu,
    (match, name: string) => values[name] ?? match,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
