import { describe, expect, it } from "vitest";

import { pseudoLocalize, pseudoLocalizeCatalog } from "@/i18n/pseudo";
import { isInterfaceLocale, routing } from "@/i18n/routing";
import messages from "../messages/en.json";
import italianMessages from "../messages/it.json";
import frenchMessages from "../messages/fr.json";
import germanMessages from "../messages/de.json";
import spanishMessages from "../messages/es.json";
import brazilianPortugueseMessages from "../messages/pt-BR.json";

type CatalogNode = string | { readonly [key: string]: CatalogNode };

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([^}]+)\}/gu)]
    .map((match) => match[1])
    .filter((placeholder): placeholder is string => placeholder !== undefined)
    .sort();
}

function expectCatalogContract(
  source: CatalogNode,
  candidate: CatalogNode,
  path = "catalog",
): void {
  if (typeof source === "string") {
    expect(typeof candidate, `${path} must remain a message`).toBe("string");
    if (typeof candidate === "string") {
      expect(placeholders(candidate), `${path} placeholders`).toEqual(
        placeholders(source),
      );
    }
    return;
  }

  expect(typeof candidate, `${path} must remain a message group`).toBe(
    "object",
  );
  expect(candidate).not.toBeNull();
  if (typeof candidate !== "object") return;

  const sourceKeys = Object.keys(source).sort();
  const candidateKeys = Object.keys(candidate).sort();
  expect(candidateKeys, `${path} keys`).toEqual(sourceKeys);

  for (const key of sourceKeys) {
    const sourceValue = source[key];
    const candidateValue = candidate[key];
    expect(sourceValue, `${path}.${key} source value`).toBeDefined();
    expect(candidateValue, `${path}.${key} candidate value`).toBeDefined();
    if (sourceValue !== undefined && candidateValue !== undefined) {
      expectCatalogContract(sourceValue, candidateValue, `${path}.${key}`);
    }
  }
}

describe("interface locale boundary", () => {
  it("enables the evaluated public locales and rejects unsupported locales", () => {
    expect(routing.locales).toEqual(["en", "it", "fr", "de", "es", "pt-BR"]);
    expect(routing.defaultLocale).toBe("en");
    expect(isInterfaceLocale("en")).toBe(true);
    expect(isInterfaceLocale("it")).toBe(true);
    expect(isInterfaceLocale("fr")).toBe(true);
    expect(isInterfaceLocale("de")).toBe(true);
    expect(isInterfaceLocale("es")).toBe(true);
    expect(isInterfaceLocale("pt-BR")).toBe(true);
    expect(isInterfaceLocale("pt")).toBe(false);
  });

  it("can pseudo-localize the complete catalog without losing its shape", () => {
    const pseudo = pseudoLocalizeCatalog(messages);

    expect(Object.keys(pseudo)).toEqual(Object.keys(messages));
    expect(pseudo).toMatchObject({
      Home: {
        title: "［Hààrmôôny, ààdmïïnïïstëërëëd. ···］",
      },
    });
    expect(JSON.stringify(pseudo).length).toBeGreaterThan(
      JSON.stringify(messages).length,
    );
    expect(pseudoLocalize("Step {current}")).toContain("{current}");
  });

  it("keeps the Italian catalog structurally and parametrically compatible", () => {
    expectCatalogContract(messages, italianMessages);
    expect(italianMessages.Home.title).toBe("L'armonia, amministrata.");
  });

  it.each([
    ["French", frenchMessages],
    ["German", germanMessages],
    ["Spanish", spanishMessages],
    ["Brazilian Portuguese", brazilianPortugueseMessages],
  ])(
    "keeps the %s catalog structurally and parametrically compatible",
    (_, catalog) => {
      expectCatalogContract(messages, catalog);
    },
  );
});
