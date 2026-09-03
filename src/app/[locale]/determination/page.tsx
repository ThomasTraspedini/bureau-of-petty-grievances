import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DeterminationExperience } from "@/features/determination/determination-experience";
import { getRequestMessageCatalog } from "@/i18n/request-catalog";
import { routing } from "@/i18n/routing";

import {
  cancelSuccessorInvitation,
  getStandardAccessStatus,
  issueSuccessorInvitation,
} from "../access/actions";

interface DeterminationPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: DeterminationPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Determination" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function DeterminationPage({
  params,
}: DeterminationPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const messages = await getRequestMessageCatalog(locale);
  const access = await getStandardAccessStatus();
  return (
    <DeterminationExperience
      locale={locale}
      copy={messages.Determination}
      navigation={messages.Navigation}
      publicRecord={messages.PublicRecord}
      standardAccessCopy={messages.StandardAccess}
      standardAccess={access.status === "available" ? access.summary : null}
      issueInvitation={issueSuccessorInvitation}
      cancelInvitation={cancelSuccessorInvitation.bind(null, locale)}
    />
  );
}
