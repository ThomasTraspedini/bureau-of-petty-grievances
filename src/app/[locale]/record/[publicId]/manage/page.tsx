import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { PublicRecordManagement } from "@/features/public-record/public-record-management";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ManagementPageProps {
  params: Promise<{ locale: string; publicId: string }>;
}

export async function generateMetadata({
  params,
}: ManagementPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "PublicRecord" });
  return {
    title: t("managementMetadataTitle"),
    description: t("managementMetadataDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function ManagementPage({ params }: ManagementPageProps) {
  const { locale, publicId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return (
    <PublicRecordManagement
      publicId={publicId}
      locale={locale}
      messages={getMessageCatalog(locale)}
    />
  );
}
