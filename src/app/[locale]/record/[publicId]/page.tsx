import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { createPublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";
import { PublicRecordExperience } from "@/features/public-record/public-record-experience";
import { localizePublicRecordShare } from "@/features/public-record/public-record-sharing-copy";
import { getMessageCatalog } from "@/i18n/catalogs";
import { openGraphLocales, routing } from "@/i18n/routing";
import { getRuntimePublicRecordOrigin } from "@/server/public-record/public-record-origin";
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
  const { locale, publicId } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const messages = getMessageCatalog(locale);
  const genericMetadata: Metadata = {
    title: messages.PublicRecord.metadataTitle,
    description: messages.PublicRecord.metadataDescription,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      title: messages.PublicRecord.metadataTitle,
      description: messages.PublicRecord.metadataDescription,
      images: [],
    },
    twitter: {
      card: "summary",
      title: messages.PublicRecord.metadataTitle,
      description: messages.PublicRecord.metadataDescription,
      images: [],
    },
  };
  const origin = getRuntimePublicRecordOrigin();
  if (origin.status !== "valid") return genericMetadata;
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) return genericMetadata;
  const result = await getPublicRecordWith(publicId, repository, new Date());
  if (result.status !== "available") return genericMetadata;

  const descriptor = createPublicRecordShareDescriptor(result.record);
  const localized = localizePublicRecordShare(
    descriptor,
    locale,
    messages.Sharing,
  );
  const canonicalPath = `/${locale}/record/${publicId}`;
  const canonicalUrl = new URL(canonicalPath, origin.origin).toString();
  const imageUrl = new URL(
    `${canonicalPath}/social-image?v=${encodeURIComponent(result.record.updatedAt)}`,
    origin.origin,
  ).toString();
  return {
    title: localized.metadataTitle,
    description: localized.shareText,
    robots: { index: false, follow: false },
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      siteName: messages.Navigation.brandName,
      url: canonicalUrl,
      title: localized.metadataTitle,
      description: localized.shareText,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: localized.imageAlt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: localized.metadataTitle,
      description: localized.shareText,
      images: [{ url: imageUrl, alt: localized.imageAlt }],
    },
  };
}

export default async function PublicRecordPage({
  params,
}: PublicRecordPageProps) {
  const { locale, publicId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const origin = getRuntimePublicRecordOrigin();
  if (origin.status !== "valid") notFound();
  const repository = await getRuntimePublicRecordRepository();
  if (repository === null) notFound();
  const result = await getPublicRecordWith(publicId, repository, new Date());
  if (result.status !== "available") notFound();

  return (
    <PublicRecordExperience
      record={result.record}
      locale={locale}
      publicUrl={new URL(
        `/${locale}/record/${publicId}`,
        origin.origin,
      ).toString()}
      messages={getMessageCatalog(locale)}
    />
  );
}
