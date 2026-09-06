"use client";

import { useEffect, useState } from "react";

import type { DeterminationSnapshot } from "@/domain/determination/determination-experience";
import type { DeterminationLanguageDiagnostics } from "@/domain/determination/determination-diagnostics";
import type { StandardAccessSummary } from "@/domain/access/standard-access";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { CivicSeal } from "../application-shell/application-shell";
import { PublicRecordPublication } from "../public-record/public-record-publication";
import { SuccessorTransfer } from "../access/successor-transfer";
import { SurfaceObserver } from "../observability/surface-observer";
import { DeterminationRecord } from "./determination-record";
import {
  determinationSessionKey,
  legacyDeterminationSessionKeyV4,
  LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
  LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
  LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
  parseDeterminationSession,
} from "./determination-session";

type DeterminationCopy = MessageCatalog["Determination"];
type NavigationCopy = MessageCatalog["Navigation"];
type PublicRecordCopy = MessageCatalog["PublicRecord"];

interface DeterminationExperienceProps {
  locale: InterfaceLocale;
  copy: DeterminationCopy;
  navigation: NavigationCopy;
  publicRecord: PublicRecordCopy;
  standardAccessCopy?: MessageCatalog["StandardAccess"];
  standardAccess?: StandardAccessSummary | null;
  issueInvitation?: Parameters<typeof SuccessorTransfer>[0]["issueInvitation"];
  cancelInvitation?: Parameters<
    typeof SuccessorTransfer
  >[0]["cancelInvitation"];
}

export function DeterminationExperience({
  locale,
  copy,
  navigation,
  publicRecord,
  standardAccessCopy,
  standardAccess = null,
  issueInvitation,
  cancelInvitation,
}: DeterminationExperienceProps) {
  const [snapshot, setSnapshot] = useState<DeterminationSnapshot | null>(null);
  const [diagnostics, setDiagnostics] =
    useState<DeterminationLanguageDiagnostics | null>(null);
  const currentSessionKey = determinationSessionKey(locale);
  const previousSessionKey = legacyDeterminationSessionKeyV4(locale);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = parseDeterminationSession(
        window.sessionStorage.getItem(currentSessionKey) ??
          window.sessionStorage.getItem(previousSessionKey) ??
          (locale === "en"
            ? (window.sessionStorage.getItem(
                LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
              ) ??
              window.sessionStorage.getItem(
                LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
              ) ??
              window.sessionStorage.getItem(
                LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
              ))
            : null),
        Date.now(),
        locale,
      );
      if (stored.status !== "restored") {
        window.sessionStorage.removeItem(currentSessionKey);
        window.sessionStorage.removeItem(previousSessionKey);
        window.sessionStorage.removeItem(
          LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
        );
        window.sessionStorage.removeItem(
          LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
        );
        window.sessionStorage.removeItem(
          LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
        );
        window.location.replace(
          `/${locale}/file/review?notice=determination-unavailable`,
        );
        return;
      }
      window.sessionStorage.removeItem(
        LEGACY_DOMESTIC_DETERMINATION_SESSION_KEY,
      );
      window.sessionStorage.removeItem(previousSessionKey);
      window.sessionStorage.removeItem(
        LEGACY_DEPARTMENT_DETERMINATION_SESSION_KEY,
      );
      window.sessionStorage.removeItem(
        LEGACY_CHRONOLOGY_DETERMINATION_SESSION_KEY,
      );
      setSnapshot(stored.snapshot);
      setDiagnostics(stored.diagnostics);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [currentSessionKey, locale, previousSessionKey]);

  if (!snapshot) {
    return (
      <div className="determination-restore" role="status">
        <CivicSeal initial={navigation.brandInitial} />
        <p>{copy.restoring}</p>
      </div>
    );
  }

  return (
    <>
      <SurfaceObserver
        locale={locale}
        surface={{
          name: "determination",
          department: snapshot.filing.department,
        }}
      />
      <DeterminationRecord
        snapshot={snapshot}
        locale={locale}
        copy={copy}
        navigation={navigation}
        sessionLabel={copy.sessionLabel}
        boundaryTitle={copy.transientTitle}
        boundaryBody={copy.transientBody}
        actions={
          <>
            <a
              className="button button-secondary"
              href={`/${locale}/file/review`}
            >
              {copy.reviewAction}
            </a>
            <a className="button button-primary" href={`/${locale}`}>
              {copy.homeAction}
            </a>
          </>
        }
        afterRecord={
          <>
            {diagnostics ? (
              <EvaluationLanguageComparison
                diagnostics={diagnostics}
                snapshot={snapshot}
                copy={copy}
              />
            ) : null}
            <PublicRecordPublication
              snapshot={snapshot}
              locale={locale}
              copy={publicRecord}
            />
            {standardAccess &&
            standardAccessCopy &&
            issueInvitation &&
            cancelInvitation ? (
              <SuccessorTransfer
                locale={locale}
                copy={standardAccessCopy}
                summary={standardAccess}
                issueInvitation={issueInvitation}
                cancelInvitation={cancelInvitation}
              />
            ) : null}
          </>
        }
      />
    </>
  );
}

function EvaluationLanguageComparison({
  diagnostics,
  snapshot,
  copy,
}: {
  diagnostics: DeterminationLanguageDiagnostics;
  snapshot: DeterminationSnapshot;
  copy: DeterminationCopy;
}) {
  const personalized = diagnostics.source === "personalized";
  return (
    <aside
      className="evaluation-language-panel"
      aria-labelledby="language-panel-title"
    >
      <p className="eyebrow">{copy.evaluationLanguageKicker}</p>
      <h2 id="language-panel-title">
        {personalized
          ? copy.evaluationPersonalizedTitle
          : copy.evaluationStandardTitle}
      </h2>
      <p>
        {personalized
          ? copy.evaluationPersonalizedBody
          : copy.evaluationStandardBody}
      </p>
      {personalized ? (
        <details>
          <summary>{copy.evaluationCompareAction}</summary>
          <div className="evaluation-language-comparison">
            <LanguageColumn
              title={copy.evaluationPersonalizedLabel}
              allegation={snapshot.language.allegation.text}
              finding={snapshot.language.finding.text}
              remedy={snapshot.language.remedy.instruction.text}
            />
            <LanguageColumn
              title={copy.evaluationStandardLabel}
              allegation={diagnostics.standardLanguage.allegation.text}
              finding={diagnostics.standardLanguage.finding.text}
              remedy={diagnostics.standardLanguage.remedy.instruction.text}
            />
          </div>
        </details>
      ) : null}
    </aside>
  );
}

function LanguageColumn({
  title,
  allegation,
  finding,
  remedy,
}: {
  title: string;
  allegation: string;
  finding: string;
  remedy: string;
}) {
  return (
    <section>
      <h3>{title}</h3>
      <p>{allegation}</p>
      <p>{finding}</p>
      <p>{remedy}</p>
    </section>
  );
}
