import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { PublicRecordExperience } from "@/features/public-record/public-record-experience";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";
import { getPublicRecordWith } from "@/server/public-record/public-record-service";
import { getRuntimePublicRecordRepository } from "@/server/public-record/runtime-public-records";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PublicRecordPageProps {
  params: Promise<{ locale: string; publicId: string }>;
}

export async function generateMetadata({
  params,
}: PublicRecordPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "PublicRecord" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function PublicRecordPage({
  params,
}: PublicRecordPageProps) {
  const { locale, publicId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) notFound();
  const result = await getPublicRecordWith(publicId, repository, new Date());
  if (result.status !== "available") notFound();

  return (
    <PublicRecordExperience
      record={result.record}
      locale={locale}
      messages={getMessageCatalog(locale)}
    />
  );
}
