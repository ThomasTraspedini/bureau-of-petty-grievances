import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { openGraphLocales, routing } from "@/i18n/routing";

import "../globals.css";

const publicSans = localFont({
  src: "../../../prototype/assets/fonts/PublicSans-Variable.ttf",
  variable: "--font-public-sans",
  display: "swap",
  weight: "100 900",
});

const sourceSerif = localFont({
  src: "../../../prototype/assets/fonts/SourceSerif4-Variable.ttf",
  variable: "--font-source-serif",
  display: "swap",
  weight: "200 900",
});

const plexMono = localFont({
  src: "../../../prototype/assets/fonts/IBMPlexMono-Regular.ttf",
  variable: "--font-plex-mono",
  display: "swap",
  weight: "400",
});

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f6f1e7",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      type: "website",
      locale: openGraphLocales[locale],
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${publicSans.variable} ${sourceSerif.variable} ${plexMono.variable}`}
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
