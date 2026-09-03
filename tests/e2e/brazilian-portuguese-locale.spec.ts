import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { routing } from "@/i18n/routing";

test.skip(
  !routing.locales.map(String).includes("pt-BR"),
  "Brazilian Portuguese is tested automatically when its public route is enabled.",
);

test("completes the Brazilian Portuguese filing, determination, publication, and consultation journey", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pt-BR");

  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page).toHaveTitle(
    "Bureau of Petty Grievances — Harmonia, administrada.",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Registre uma pequena queixa recorrente e receba uma determinação justa, pronta para compartilhar.",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Harmonia, administrada.",
    }),
  ).toBeVisible();

  const landingResults = await new AxeBuilder({ page }).analyze();
  expect(landingResults.violations).toEqual([]);

  await page.getByRole("link", { name: "Registrar uma queixa" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/file\/respondent$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A quem esta queixa se refere?",
    }),
  ).toBeVisible();

  await page
    .getByRole("textbox", {
      name: "Identificação alternativa da pessoa envolvida",
    })
    .fill("Marco");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: "Amigo ou amiga" }).check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", {
      name: "Cronologia Promessas, estimativas, chegadas e atrasos mensuráveis.",
    })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", {
      name: "Declarou “estou saindo” antes de estar pronto Meça o tempo entre a declaração e o momento em que a pessoa estava efetivamente pronta.",
    })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByLabel("Horário em que foi declarado “estou saindo”")
    .fill("19:30");
  await page.getByLabel("Atraso registrado").fill("24");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", { name: "Uma mesa ou reserva precisou ser mantida" })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("radio", { name: "Geralmente traz a sobremesa" })
    .check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("textbox", { name: "Declaração apresentada" })
    .fill(
      "A saída foi anunciada enquanto os sapatos ainda estavam sendo procurados.",
    );
  await page.getByRole("button", { name: "Revisar o registro" }).click();

  await expect(page).toHaveURL(/\/pt-BR\/file\/review$/u);
  await page.getByRole("button", { name: "Enviar para determinação" }).click();
  await expect(page).toHaveURL(/\/pt-BR\/determination$/u);
  await expect(
    page.getByRole("heading", { name: "Análise referente a Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Queixa acolhida, circunstâncias registradas"),
  ).toBeVisible();
  await expect(page.getByText(/24 minutos/u).first()).toBeVisible();
  await expect(page.getByText(/saída|preparação/u).first()).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Análise referente a Marco" }),
  ).toBeVisible();

  const determinationResults = await new AxeBuilder({ page }).analyze();
  expect(determinationResults.violations).toEqual([]);

  await page
    .getByRole("checkbox", {
      name: /Compreendo que qualquer pessoa que disponha do endereço público/u,
    })
    .check();
  await page.getByRole("button", { name: "Criar o registro público" }).click();
  await expect(
    page.getByRole("heading", {
      name: "O registro público está disponível.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Abrir o registro público" }).click();

  await expect(page).toHaveURL(/\/pt-BR\/record\//u);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(
    page.getByRole("heading", { name: "Análise referente a Marco" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Contribua para a compreensão pública do caso.",
    }),
  ).toBeVisible();

  const publicRecordResults = await new AxeBuilder({ page }).analyze();
  expect(publicRecordResults.violations).toEqual([]);

  await page.getByRole("button", { name: /^Queixa acolhida/u }).click();
  await expect(
    page.getByText("Sua posição foi inscrita no registro público."),
  ).toBeVisible();
});
