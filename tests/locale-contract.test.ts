import { describe, expect, it } from "vitest";

import { pseudoLocalize, pseudoLocalizeCatalog } from "@/i18n/pseudo";
import { isInterfaceLocale, routing } from "@/i18n/routing";
import messages from "../messages/en.json";

describe("interface locale boundary", () => {
  it("enables English explicitly and rejects unsupported locales", () => {
    expect(routing.locales).toEqual(["en"]);
    expect(routing.defaultLocale).toBe("en");
    expect(isInterfaceLocale("en")).toBe(true);
    expect(isInterfaceLocale("fr")).toBe(false);
  });

  it("can pseudo-localize the complete catalog without losing its shape", () => {
    const pseudo = pseudoLocalizeCatalog(messages);

    expect(Object.keys(pseudo)).toEqual(Object.keys(messages));
    expect(pseudo).toMatchObject({
      Home: {
        title: "［Hàrmôny, àdmïnïstërëd. ···］",
      },
    });
    expect(JSON.stringify(pseudo).length).toBeGreaterThan(
      JSON.stringify(messages).length,
    );
    expect(pseudoLocalize("Step {current}")).toContain("{current}");
  });
});
