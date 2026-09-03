import "server-only";

import { headers } from "next/headers";

import { getMessageCatalog, type MessageCatalog } from "./catalogs";
import { pseudoLocalizeCatalog } from "./pseudo";
import type { InterfaceLocale } from "./routing";

const PSEUDO_LOCALIZATION_HEADER = "x-bureau-e2e-pseudo-localization";

export async function getRequestMessageCatalog(
  locale: InterfaceLocale,
): Promise<MessageCatalog> {
  const catalog = getMessageCatalog(locale);
  const requestHeaders = await headers();

  if (
    process.env.BUREAU_E2E_PSEUDO_LOCALIZATION !== "1" ||
    requestHeaders.get(PSEUDO_LOCALIZATION_HEADER) !== "1"
  ) {
    return catalog;
  }

  const pseudo = pseudoLocalizeCatalog(catalog);

  return {
    ...pseudo,
    Navigation: {
      ...pseudo.Navigation,
      brandInitial: catalog.Navigation.brandInitial,
    },
    Home: {
      ...pseudo.Home,
      standardOneIndex: catalog.Home.standardOneIndex,
      standardTwoIndex: catalog.Home.standardTwoIndex,
      standardThreeIndex: catalog.Home.standardThreeIndex,
    },
    Determination: {
      ...pseudo.Determination,
      findingIndex: catalog.Determination.findingIndex,
      consequenceIndex: catalog.Determination.consequenceIndex,
      mitigationIndex: catalog.Determination.mitigationIndex,
    },
    Sharing: {
      ...pseudo.Sharing,
      brandInitial: catalog.Sharing.brandInitial,
    },
  };
}
