import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { StandardAccess } from "@/features/access/standard-access";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";

import {
  cancelSuccessorInvitation,
  exchangeStandardToken,
  getStandardAccessStatus,
  issueSuccessorInvitation,
} from "./actions";

interface StandardAccessPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: StandardAccessPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const copy = getMessageCatalog(locale).StandardAccess;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default async function StandardAccessPage({
  params,
}: StandardAccessPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = getMessageCatalog(locale);
  return (
    <StandardAccess
      locale={locale}
      copy={messages.StandardAccess}
      navigation={messages.Navigation}
      exchangeToken={exchangeStandardToken}
      getStatus={getStandardAccessStatus}
      issueInvitation={issueSuccessorInvitation}
      cancelInvitation={cancelSuccessorInvitation}
    />
  );
}
