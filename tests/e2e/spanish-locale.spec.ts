import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { routing } from "@/i18n/routing";

test.skip(
  !routing.locales.map(String).includes("es"),
  "Spanish is tested automatically when its public route is enabled.",
);

test("completes the Spanish filing, determination, publication, and consultation journey", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page).toHaveTitle(
    "Bureau of Petty Grievances — La armonía, administrada.",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Presente una pequeña queja recurrente y reciba una determinación justa, lista para compartir.",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "La armonía, administrada.",
    }),
  ).toBeVisible();

  const landingResults = await new AxeBuilder({ page }).analyze();
  expect(landingResults.violations).toEqual([]);

  await page.getByRole("link", { name: "Presentar una queja" }).click();
  await expect(page).toHaveURL(/\/es\/file\/respondent$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "¿A quién se refiere esta queja?",
    }),
  ).toBeVisible();

  await page
    .getByRole("textbox", { name: "Alias de la persona interesada" })
    .fill("Marco");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Amigo o amiga" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", {
      name: "Cronología Promesas, estimaciones, llegadas y retrasos mensurables.",
    })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", {
      name: "Declaró «ya salgo» antes de completar la preparación Mida el tiempo transcurrido entre la declaración y la preparación efectiva.",
    })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Hora de la declaración «ya salgo»").fill("19:30");
  await page.getByLabel("Retraso registrado").fill("24");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", { name: "Se retuvo una mesa o una reserva" })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Suele llevar el postre" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("textbox", { name: "Declaración presentada" })
    .fill("Anunció la salida mientras todavía buscaba los zapatos.");
  await page.getByRole("button", { name: "Revisar el expediente" }).click();

  await expect(page).toHaveURL(/\/es\/file\/review$/u);
  await page.getByRole("button", { name: "Enviar para determinación" }).click();
  await expect(page).toHaveURL(/\/es\/determination$/u);
  await expect(
    page.getByRole("heading", { name: "Revisión relativa a Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Queja estimada, con circunstancias anotadas"),
  ).toBeVisible();
  await expect(page.getByText(/24 minutos/u).first()).toBeVisible();
  await expect(page.getByText(/salida|preparación/u).first()).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Revisión relativa a Marco" }),
  ).toBeVisible();

  const determinationResults = await new AxeBuilder({ page }).analyze();
  expect(determinationResults.violations).toEqual([]);

  await page
    .getByRole("checkbox", {
      name: /Comprendo que cualquier persona que disponga de la dirección pública/u,
    })
    .check();
  await page.getByRole("button", { name: "Crear el registro público" }).click();
  await expect(
    page.getByRole("heading", {
      name: "El registro público está disponible.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Abrir el registro público" }).click();

  await expect(page).toHaveURL(/\/es\/record\//u);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.getByRole("heading", { name: "Revisión relativa a Marco" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Contribuya a la comprensión pública de la cuestión.",
    }),
  ).toBeVisible();

  const publicRecordResults = await new AxeBuilder({ page }).analyze();
  expect(publicRecordResults.violations).toEqual([]);

  await page.getByRole("button", { name: /^Queja estimada/u }).click();
  await expect(
    page.getByText("Su posición se ha inscrito en el registro público."),
  ).toBeVisible();
});
