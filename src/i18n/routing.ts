import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: false,
});

export type InterfaceLocale = (typeof routing.locales)[number];

export const openGraphLocales: Record<InterfaceLocale, string> = {
  en: "en_US",
};

export function isInterfaceLocale(value: string): value is InterfaceLocale {
  return routing.locales.some((locale) => locale === value);
}
