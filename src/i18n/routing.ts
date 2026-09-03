import { defineRouting } from "next-intl/routing";
import { PRODUCT_LOCALES, type ProductLocale } from "@/domain/locale";

export const routing = defineRouting({
  locales: PRODUCT_LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: false,
});

export type InterfaceLocale = ProductLocale;

export const openGraphLocales: Record<InterfaceLocale, string> = {
  en: "en_US",
  it: "it_IT",
};

export function isInterfaceLocale(value: string): value is InterfaceLocale {
  return routing.locales.some((locale) => locale === value);
}
