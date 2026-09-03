"use client";

import { useParams } from "next/navigation";

import { getMessageCatalog } from "@/i18n/catalogs";
import { Link } from "@/i18n/navigation";
import { isInterfaceLocale, routing } from "@/i18n/routing";

export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const requestedLocale = params.locale;
  const locale =
    typeof requestedLocale === "string" && isInterfaceLocale(requestedLocale)
      ? requestedLocale
      : routing.defaultLocale;
  const copy = getMessageCatalog(locale).NotFound;

  return (
    <main className="not-found" id="main-content">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <Link className="button button-primary" href="/" locale={locale}>
          {copy.action}
        </Link>
      </div>
    </main>
  );
}
