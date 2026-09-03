import en from "../../messages/en.json";
import it from "../../messages/it.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import es from "../../messages/es.json";
import ptBR from "../../messages/pt-BR.json";

import type { InterfaceLocale } from "./routing";

export type MessageCatalog = typeof en;

const catalogs: Record<InterfaceLocale, MessageCatalog> = {
  en,
  it,
  fr,
  de,
  es,
  "pt-BR": ptBR,
};

export function getMessageCatalog(locale: InterfaceLocale): MessageCatalog {
  return catalogs[locale];
}

export const fallbackCatalog = en;
