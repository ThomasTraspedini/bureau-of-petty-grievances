import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import {
  ApplicationShell,
  type ApplicationShellCopy,
} from "@/features/application-shell/application-shell";
import { getMessageCatalog } from "@/i18n/catalogs";
import { routing } from "@/i18n/routing";
import { SurfaceObserver } from "@/features/observability/surface-observer";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = getMessageCatalog(locale);

  const copy: ApplicationShellCopy = {
    navigation: messages.Navigation,
    home: messages.Home,
  };

  return (
    <>
      <SurfaceObserver locale={locale} surface={{ name: "landing" }} />
      <ApplicationShell locale={locale} copy={copy} />
    </>
  );
}
