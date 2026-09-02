import en from "../../messages/en.json";

import type { InterfaceLocale } from "./routing";

export type MessageCatalog = typeof en;

const catalogs: Record<InterfaceLocale, MessageCatalog> = {
  en,
};

export function getMessageCatalog(locale: InterfaceLocale): MessageCatalog {
  return catalogs[locale];
}

export const fallbackCatalog = en;
