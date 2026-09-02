"use client";

import { useEffect, useState } from "react";

import type { ChronologyDeterminationSnapshot } from "@/domain/determination/determination-experience";
import type { StandardAccessSummary } from "@/domain/access/standard-access";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { CivicSeal } from "../application-shell/application-shell";
import { PublicRecordPublication } from "../public-record/public-record-publication";
import { SuccessorTransfer } from "../access/successor-transfer";
import { DeterminationRecord } from "./determination-record";
import {
  DETERMINATION_SESSION_KEY,
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
  const [snapshot, setSnapshot] =
    useState<ChronologyDeterminationSnapshot | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = parseDeterminationSession(
        window.sessionStorage.getItem(DETERMINATION_SESSION_KEY),
        Date.now(),
      );
      if (stored.status !== "restored") {
        window.sessionStorage.removeItem(DETERMINATION_SESSION_KEY);
        window.location.replace(
          `/${locale}/file/review?notice=determination-unavailable`,
        );
        return;
      }
      setSnapshot(stored.snapshot);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [locale]);

  if (!snapshot) {
    return (
      <div className="determination-restore" role="status">
        <CivicSeal initial={navigation.brandInitial} />
        <p>{copy.restoring}</p>
      </div>
    );
  }

  return (
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
  );
}
