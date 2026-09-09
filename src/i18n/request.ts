import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { getRequestMessageCatalog } from "./request-catalog";
import { routing } from "./routing";

// Keep the root parameter typed before Next.js generates its route declarations.
declare module "next/root-params" {
  export function locale(): Promise<string>;
}

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const routeLocale = await rootParams.locale();

    if (!hasLocale(routing.locales, routeLocale)) {
      notFound();
    }

    locale = routeLocale;
  }

  return {
    locale,
    messages: await getRequestMessageCatalog(locale),
  };
});
