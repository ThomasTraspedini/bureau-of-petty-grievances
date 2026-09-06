import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { routing } from "@/i18n/routing";

test.skip(
  !routing.locales.map(String).includes("it"),
  "Italian is tested automatically when its public route is enabled.",
);

test("renders the Italian landing page, opens filing, and passes accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/it");

  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(page).toHaveTitle(
    "Bureau of Petty Grievances — L'armonia, amministrata.",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Presenti una piccola rimostranza ricorrente e riceva una determinazione equa, pronta da condividere.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "L'armonia, amministrata." }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("italian-landing-desktop.png", {
    fullPage: true,
  });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.getByRole("link", { name: "Depositare una rimostranza" }).click();
  await expect(page).toHaveURL(/\/it\/file\/respondent$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A chi si riferisce questa rimostranza?",
    }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Alias della persona interessata" })
    .fill("Marco");
  await page.getByRole("button", { name: "Continuare" }).click();
  await page.getByRole("radio", { name: "Amico" }).check();
  await page.getByRole("button", { name: "Continuare" }).click();
  await page
    .getByRole("radio", {
      name: "Cronologia Promesse, stime, arrivi e ritardi misurabili.",
    })
    .check();
  await page.getByRole("button", { name: "Continuare" }).click();
  await page
    .getByRole("radio", {
      name: "Ha dichiarato «sto uscendo» prima di essere pronto Misuri il tempo fra la dichiarazione e l'effettiva prontezza.",
    })
    .check();
  await page.getByRole("button", { name: "Continuare" }).click();
  await page
    .getByLabel("Orario della dichiarazione «sto uscendo»")
    .fill("19:30");
  await page.getByLabel("Ritardo registrato").fill("24");
  await page.getByRole("button", { name: "Continuare" }).click();
  await page
    .getByRole("radio", {
      name: "Un tavolo o una prenotazione è stato trattenuto",
    })
    .check();
  await page.getByRole("button", { name: "Continuare" }).click();
  await page.getByRole("radio", { name: "Di solito porta il dolce" }).check();
  await page.getByRole("button", { name: "Continuare" }).click();
  await page
    .getByRole("textbox", { name: "Dichiarazione presentata" })
    .fill("Ha dichiarato di uscire mentre cercava ancora le scarpe.");
  await page.getByRole("button", { name: "Rivedere l'atto" }).click();

  await expect(page).toHaveURL(/\/it\/file\/review$/u);
  await page
    .getByRole("button", { name: "Inviare per la determinazione" })
    .click();
  await expect(page).toHaveURL(/\/it\/determination$/u);
  await expect(
    page.getByRole("heading", { name: "Esame relativo a Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Rimostranza accolta, con circostanze annotate"),
  ).toBeVisible();
  await expect(page.getByText(/24 minuti/u).first()).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Esame relativo a Marco" }),
  ).toBeVisible();
  await page.locator(".determination-shell").evaluate((element) => {
    element.setAttribute("data-variant", "1");
  });
  await page
    .locator(".determination-metadata > div:nth-child(2) strong")
    .evaluate((element) => {
      element.textContent = "3 settembre 2026";
    });
  // This journey issues a random reference; its stamp placement is tested
  // separately. Normalize it alongside the variant and date for visual checks.
  await page.locator(".remedy-stamp").evaluate((element) => {
    element.setAttribute(
      "style",
      "transform: translate(0px, 0px) rotate(0deg)",
    );
  });
  await expect(page).toHaveScreenshot("italian-determination-desktop.png", {
    fullPage: true,
    mask: [page.locator(".determination-metadata > div:first-child strong")],
  });

  const determinationResults = await new AxeBuilder({ page }).analyze();
  expect(determinationResults.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot("italian-determination-mobile.png", {
    fullPage: true,
    mask: [page.locator(".determination-metadata > div:first-child strong")],
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("checkbox", {
      name: /Comprendo che chiunque disponga dell'indirizzo pubblico/u,
    })
    .check();
  await page.getByRole("button", { name: "Creare l'atto pubblico" }).click();
  await expect(
    page.getByRole("heading", { name: "L'atto pubblico è disponibile." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Aprire l'atto pubblico" }).click();

  await expect(page).toHaveURL(/\/it\/record\//u);
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await expect(
    page.getByRole("heading", { name: "Esame relativo a Marco" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Contribuisca alla comprensione pubblica della questione.",
    }),
  ).toBeVisible();

  const publicRecordResults = await new AxeBuilder({ page }).analyze();
  expect(publicRecordResults.violations).toEqual([]);
});
