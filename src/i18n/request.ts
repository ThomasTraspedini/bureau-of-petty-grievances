import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { getMessageCatalog } from "./catalogs";
import { routing } from "./routing";

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
    messages: getMessageCatalog(locale),
  };
});
