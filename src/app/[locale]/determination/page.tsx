import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DeterminationExperience } from "@/features/determination/determination-experience";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";

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

  const messages = getMessageCatalog(locale);
  return (
    <DeterminationExperience
      locale={locale}
      copy={messages.Determination}
      navigation={messages.Navigation}
      publicRecord={messages.PublicRecord}
    />
  );
}
