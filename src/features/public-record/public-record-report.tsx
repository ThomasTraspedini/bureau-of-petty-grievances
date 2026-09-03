"use client";

import { useRef, useState } from "react";

import { reportPublicRecord } from "@/app/[locale]/record/actions";
import type { PublicRecordReportReason } from "@/domain/public-record/public-record";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import { currentAnalyticsJourneyId } from "../observability/browser-product-analytics";

import { createReportKey } from "./public-record-publication";

export function PublicRecordReport({
  publicId,
  locale,
  copy,
}: {
  publicId: string;
  locale: InterfaceLocale;
  copy: MessageCatalog["PublicRecord"];
}) {
  const [reason, setReason] = useState<PublicRecordReportReason | null>(null);
  const [state, setState] = useState<
    "idle" | "reporting" | "reported" | "failed"
  >("idle");
  const reportKey = useRef<string | null>(null);

  async function submitReport() {
    if (reason === null || state === "reporting") return;
    reportKey.current ??= createReportKey();
    setState("reporting");
    try {
      const input = {
        publicId,
        reportKey: reportKey.current,
        reason,
      };
      const journeyId = currentAnalyticsJourneyId();
      const result = journeyId
        ? await reportPublicRecord(locale, input, journeyId)
        : await reportPublicRecord(locale, input);
      setState(result === "reported" ? "reported" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <section className="public-record-panel" aria-labelledby="report-title">
      <p className="eyebrow">{copy.reportKicker}</p>
      <h2 id="report-title">{copy.reportTitle}</h2>
      <p>{copy.reportBody}</p>
      {state === "reported" ? (
        <p className="public-record-report-status" role="status">
          {copy.reportSuccess}
        </p>
      ) : (
        <>
          <fieldset className="report-reasons">
            <legend>{copy.reportReasonLabel}</legend>
            {(
              [
                ["privacy_concern", copy.reportPrivacy],
                ["harmful_content", copy.reportHarmful],
                ["wrong_person", copy.reportWrongPerson],
                ["other_safety_concern", copy.reportOther],
              ] satisfies readonly (readonly [
                PublicRecordReportReason,
                string,
              ])[]
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => {
                    setReason(value);
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {state === "failed" ? (
            <p className="public-record-error" role="alert">
              {copy.reportFailure}
            </p>
          ) : null}
          <button
            className="button button-secondary"
            type="button"
            disabled={reason === null || state === "reporting"}
            onClick={() => void submitReport()}
          >
            {state === "reporting" ? copy.reporting : copy.reportAction}
          </button>
        </>
      )}
    </section>
  );
}
