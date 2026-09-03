import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { routing } from "@/i18n/routing";

test.skip(
  !routing.locales.map(String).includes("de"),
  "German is tested automatically when its public route is enabled.",
);

test("completes the German filing, determination, publication, and consultation journey", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/de");

  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page).toHaveTitle(
    "Bureau of Petty Grievances — Harmonie, amtlich geregelt.",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Reichen Sie eine harmlose, wiederkehrende Beschwerde ein und erhalten Sie eine faire, teilbare Entscheidung.",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Harmonie, amtlich geregelt.",
    }),
  ).toBeVisible();

  const landingResults = await new AxeBuilder({ page }).analyze();
  expect(landingResults.violations).toEqual([]);

  await page.getByRole("link", { name: "Beschwerde einreichen" }).click();
  await expect(page).toHaveURL(/\/de\/file\/respondent$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Wen betrifft diese Beschwerde?",
    }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Alias der betroffenen Person" })
    .fill("Marco");
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("radio", { name: "Freund oder Freundin" }).check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page
    .getByRole("radio", {
      name: "Chronologie Zusagen, Schätzungen, Ankünfte und messbare Verzögerungen.",
    })
    .check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page
    .getByRole("radio", {
      name: "Hat „ich gehe jetzt“ erklärt, bevor die Abmarschbereitschaft bestand Messen Sie die Zeit zwischen der Erklärung und der tatsächlichen Bereitschaft.",
    })
    .check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page
    .getByLabel("Zeitpunkt der Erklärung „ich gehe jetzt“")
    .fill("19:30");
  await page.getByLabel("Erfasste Verspätung").fill("24");
  await page.getByRole("button", { name: "Weiter" }).click();
  await page
    .getByRole("radio", {
      name: "Ein Tisch oder eine Reservierung musste freigehalten werden",
    })
    .check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page
    .getByRole("radio", { name: "Bringt gewöhnlich den Nachtisch mit" })
    .check();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page
    .getByRole("textbox", { name: "Eingereichte Aussage" })
    .fill(
      "Der Aufbruch wurde angekündigt, während die Schuhe noch gesucht wurden.",
    );
  await page.getByRole("button", { name: "Vorgang prüfen" }).click();

  await expect(page).toHaveURL(/\/de\/file\/review$/u);
  await page
    .getByRole("button", { name: "Zur Entscheidung einreichen" })
    .click();
  await expect(page).toHaveURL(/\/de\/determination$/u);
  await expect(
    page.getByRole("heading", { name: "Prüfung betreffend Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Bestätigt, unter Würdigung der Umstände"),
  ).toBeVisible();
  await expect(page.getByText(/24 Minuten/u).first()).toBeVisible();
  await expect(page.getByText(/Ankunft|Aufbruch/u).first()).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Prüfung betreffend Marco" }),
  ).toBeVisible();

  const determinationResults = await new AxeBuilder({ page }).analyze();
  expect(determinationResults.violations).toEqual([]);

  await page
    .getByRole("checkbox", {
      name: /Mir ist bewusst, dass jede Person mit der öffentlichen Adresse/u,
    })
    .check();
  await page
    .getByRole("button", { name: "Öffentlichen Vorgang erstellen" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Der öffentliche Vorgang ist verfügbar.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Öffentlichen Vorgang öffnen" }).click();

  await expect(page).toHaveURL(/\/de\/record\//u);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(
    page.getByRole("heading", { name: "Prüfung betreffend Marco" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Tragen Sie zum öffentlichen Verständnis dieser Angelegenheit bei.",
    }),
  ).toBeVisible();

  const publicRecordResults = await new AxeBuilder({ page }).analyze();
  expect(publicRecordResults.violations).toEqual([]);

  await page.getByRole("button", { name: /^Beschwerde bestätigt/u }).click();
  await expect(
    page.getByText(
      "Ihre Position wurde in den öffentlichen Vorgang eingetragen.",
    ),
  ).toBeVisible();
});
