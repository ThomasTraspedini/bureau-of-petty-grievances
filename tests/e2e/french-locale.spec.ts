import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { routing } from "@/i18n/routing";

test.skip(
  !routing.locales.map(String).includes("fr"),
  "French is tested automatically when its public route is enabled.",
);

test("completes the French filing, determination, publication, and consultation journey", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr");

  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveTitle(
    "Bureau of Petty Grievances — L'harmonie, administrée.",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Déposez un petit grief récurrent et recevez une décision équitable, prête à être partagée.",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "L'harmonie, administrée.",
    }),
  ).toBeVisible();

  const landingResults = await new AxeBuilder({ page }).analyze();
  expect(landingResults.violations).toEqual([]);

  await page.getByRole("link", { name: "Déposer un grief" }).click();
  await expect(page).toHaveURL(/\/fr\/file\/respondent$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "À qui ce grief se rapporte-t-il ?",
    }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Alias de la personne concernée" })
    .fill("Marco");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: "Ami ou amie" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByRole("radio", {
      name: "Chronologie Promesses, estimations, arrivées et retards mesurables.",
    })
    .check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByRole("radio", {
      name: "A déclaré « je pars maintenant » avant d'être prêt Mesurez le temps entre la déclaration et le moment où la personne était effectivement prête.",
    })
    .check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByLabel("Heure de la déclaration « je pars maintenant »")
    .fill("19:30");
  await page.getByLabel("Retard consigné").fill("24");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByRole("radio", {
      name: "Une table ou une réservation a dû être conservée",
    })
    .check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByRole("radio", { name: "Apporte habituellement le dessert" })
    .check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page
    .getByRole("textbox", { name: "Déclaration déposée" })
    .fill(
      "Le départ a été annoncé pendant que les chaussures étaient encore recherchées.",
    );
  await page.getByRole("button", { name: "Examiner l'acte" }).click();

  await expect(page).toHaveURL(/\/fr\/file\/review$/u);
  await page.getByRole("button", { name: "Soumettre pour décision" }).click();
  await expect(page).toHaveURL(/\/fr\/determination$/u);
  await expect(
    page.getByRole("heading", { name: "Examen concernant Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Grief accueilli, circonstances consignées"),
  ).toBeVisible();
  await expect(page.getByText(/24 minutes/u).first()).toBeVisible();
  await expect(page.getByText(/départ|préparation/u).first()).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Examen concernant Marco" }),
  ).toBeVisible();

  const determinationResults = await new AxeBuilder({ page }).analyze();
  expect(determinationResults.violations).toEqual([]);

  await page
    .getByRole("checkbox", {
      name: /Je comprends que toute personne disposant de l'adresse publique/u,
    })
    .check();
  await page.getByRole("button", { name: "Créer l'acte public" }).click();
  await expect(
    page.getByRole("heading", { name: "L'acte public est disponible." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ouvrir l'acte public" }).click();

  await expect(page).toHaveURL(/\/fr\/record\//u);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("heading", { name: "Examen concernant Marco" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Contribuez à la compréhension publique de l'affaire.",
    }),
  ).toBeVisible();

  const publicRecordResults = await new AxeBuilder({ page }).analyze();
  expect(publicRecordResults.violations).toEqual([]);

  await page.getByRole("button", { name: /^Grief accueilli/u }).click();
  await expect(
    page.getByText("Votre position a été inscrite dans l'acte public."),
  ).toBeVisible();
});

test("keeps unavailable routes in the requested supported locale", async ({
  page,
}) => {
  const response = await page.goto("/fr/voie-inconnue");

  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("heading", {
      name: "Le Bureau ne parvient pas à trouver ce parcours.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Retourner au Bureau" }),
  ).toHaveAttribute("href", "/fr");
});
