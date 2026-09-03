/** Locale codes admitted at persisted and server boundaries. */
export const PRODUCT_LOCALES = ["en", "it"] as const;
export type ProductLocale = (typeof PRODUCT_LOCALES)[number];

export function isProductLocale(value: unknown): value is ProductLocale {
  return (
    typeof value === "string" &&
    PRODUCT_LOCALES.some((locale) => locale === value)
  );
}
