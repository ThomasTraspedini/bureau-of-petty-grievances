import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import en from "../../messages/en.json" with { type: "json" };
import it from "../../messages/it.json" with { type: "json" };
import fr from "../../messages/fr.json" with { type: "json" };
import de from "../../messages/de.json" with { type: "json" };
import es from "../../messages/es.json" with { type: "json" };
import ptBR from "../../messages/pt-BR.json" with { type: "json" };

const catalogs = { en, it, fr, de, es, "pt-BR": ptBR };
import { routing } from "@/i18n/routing";

test("selects every enabled language from the home chip", async ({ page }) => {
  await page.goto("/en");
  for (const locale of routing.locales) {
    await page.locator(".locale-chip").click();
    const options = page.locator(".locale-options");
    await expect(options.getByRole("link")).toHaveCount(routing.locales.length);
    await options
      .getByRole("link", {
        name: catalogs[locale].Navigation.locale,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      catalogs[locale].Home.title,
    );
    await expect(page.locator(".locale-chip")).toContainText(
      catalogs[locale].Navigation.locale,
    );
    await expect(
      page.getByRole("link", {
        name: catalogs[locale].Home.primaryAction,
      }),
    ).toHaveAttribute("href", `/${locale}/file/respondent`);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("opens, closes, and selects a language with the keyboard at narrow width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/en");
  const chip = page.locator(".locale-chip");
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".locale-options")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "English", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    (await new AxeBuilder({ page }).include(".site-header").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Space");
  await expect(page.locator(".locale-options")).not.toBeVisible();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Italiano", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/it$/u);
});
