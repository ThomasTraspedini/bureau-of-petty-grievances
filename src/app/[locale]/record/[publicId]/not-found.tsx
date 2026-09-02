import { getLocale, getTranslations } from "next-intl/server";

import { CivicSeal } from "@/features/application-shell/application-shell";
import { isInterfaceLocale } from "@/i18n/routing";

export default async function PublicRecordNotFound() {
  const locale = await getLocale();
  const safeLocale = isInterfaceLocale(locale) ? locale : "en";
  const t = await getTranslations({
    locale: safeLocale,
    namespace: "PublicRecord",
  });
  const navigation = await getTranslations({
    locale: safeLocale,
    namespace: "Navigation",
  });
  return (
    <main className="record-state-page">
      <CivicSeal initial={navigation("brandInitial")} />
      <p className="eyebrow">{t("unavailableKicker")}</p>
      <h1>{t("unavailableTitle")}</h1>
      <p>{t("unavailableBody")}</p>
      <a className="button button-primary" href={`/${safeLocale}`}>
        {t("unavailableAction")}
      </a>
    </main>
  );
}
