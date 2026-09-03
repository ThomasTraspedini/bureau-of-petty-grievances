import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { ExampleDetermination } from "@/features/determination/example-determination";
import { getMessageCatalog } from "@/i18n/catalogs";
import { getRequestMessageCatalog } from "@/i18n/request-catalog";
import { routing } from "@/i18n/routing";

interface ExamplePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: ExamplePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const copy = getMessageCatalog(locale).Example;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
  };
}

export default async function ExamplePage({ params }: ExamplePageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const messages = await getRequestMessageCatalog(locale);

  return (
    <ExampleDetermination
      locale={locale}
      copy={messages.Example}
      determination={messages.Determination}
      navigation={messages.Navigation}
    />
  );
}
