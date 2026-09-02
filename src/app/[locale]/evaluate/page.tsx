import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { EvaluationAccess } from "@/features/access/evaluation-access";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";

import { exchangeEvaluationToken } from "./actions";

interface EvaluationPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: EvaluationPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const copy = getMessageCatalog(locale).Access;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default async function EvaluationPage({ params }: EvaluationPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = getMessageCatalog(locale);
  return (
    <EvaluationAccess
      locale={locale}
      copy={messages.Access}
      navigation={messages.Navigation}
      exchangeToken={exchangeEvaluationToken}
    />
  );
}
