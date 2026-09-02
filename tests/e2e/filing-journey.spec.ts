import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const storageKey = "bpg:filing:chronology:en:v1";

const completeDraft = {
  respondent: "Marco",
  relationship: "friend",
  offence: "premature_departure",
  facts: {
    prematureDeparture: { declaredTime: "19:30", delayMinutes: "24" },
    chronicLateness: { agreedTime: "", delayMinutes: "" },
    optimisticEstimate: { estimatedMinutes: "", actualMinutes: "" },
  },
  impact: "table_held",
  mitigation: "brings_dessert",
  statement: "He said he was leaving while still looking for his shoes.",
};

async function choose(page: Page, name: string) {
  await page.getByRole("radio", { name }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

test("completes, corrects, and server-validates a Chronology filing", async ({
  page,
}) => {
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Marco");
  await page.getByRole("button", { name: "Continue" }).click();

  await choose(page, "Friend");
  await choose(
    page,
    "Declared “leaving now” before being ready Measure the time between the declaration and actual readiness.",
  );

  await page.getByLabel("Time “leaving now” was declared").fill("19:30");
  await page.getByLabel("Recorded delay").fill("24");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "A table or reservation was held");
  await choose(page, "Usually brings dessert");

  await page
    .getByRole("textbox", { name: "Submitted statement" })
    .fill("He said he was leaving while still looking for his shoes.");
  await page.getByRole("button", { name: "Review the record" }).click();

  await expect(page).toHaveURL(/\/en\/file\/review$/u);
  await expect(
    page.getByRole("heading", { name: "Confirm the submitted facts." }),
  ).toBeVisible();
  await expect(
    page.getByText("Declared at 19:30; readiness followed 24 minutes later"),
  ).toBeVisible();

  const relationshipRow = page
    .locator(".review-list > div")
    .filter({ hasText: "Relationship" });
  await relationshipRow.getByRole("link", { name: "Correct" }).click();
  await expect(page).toHaveURL(/relationship\?return=review$/u);
  await page.getByRole("radio", { name: "Sibling" }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/en\/file\/review$/u);
  await expect(relationshipRow.getByText("Sibling")).toBeVisible();

  await page.getByRole("button", { name: "Complete filing review" }).click();
  await expect(page).toHaveURL(/\/en\/file\/complete$/u);
  await expect(
    page.getByRole("heading", {
      name: "The submitted facts are ready for determination.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Validated · not submitted for determination"),
  ).toBeVisible();
});

test("preserves a safe draft across refresh and excludes rejected text", async ({
  page,
}) => {
  await page.goto("/en/file/respondent");
  await page.getByRole("textbox", { name: "Respondent alias" }).fill("Marco");
  await page.reload();
  await expect(page.getByText("Draft restored")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Respondent alias" }),
  ).toHaveValue("Marco");

  await page.goto("/en/file/statement");
  const statement = page.getByRole("textbox", { name: "Submitted statement" });
  await statement.fill("This describes abuse.");
  await page.getByRole("button", { name: "Review the record" }).click();
  await expect(page.locator(".form-error")).toContainText(
    "serious or sensitive matter",
  );
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    storageKey,
  );
  expect(stored).not.toContain("This describes abuse.");
  expect(stored).toContain("Marco");
});

test("supports keyboard choices, reduced motion, and an accessible question", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/file/relationship");
  const firstChoice = page.getByRole("radio", { name: "Friend" });
  await firstChoice.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Partner" })).toBeChecked();

  const duration = await page
    .locator(".progress-track i")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
  expect(duration).toBeLessThan(0.001);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("expires old drafts and lets the filer explicitly reset current work", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, draft }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          locale: "en",
          updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
          draft,
        }),
      );
    },
    { key: storageKey, draft: completeDraft },
  );
  await page.goto("/en/file/respondent");
  await expect(page.getByText("Saved draft expired")).toBeVisible();
  const alias = page.getByRole("textbox", { name: "Respondent alias" });
  await expect(alias).toHaveValue("");

  await alias.fill("Marco");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(
    page.getByText("This removes the saved filing from this device."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm start over" }).click();
  await expect(alias).toHaveValue("");
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    storageKey,
  );
  expect(stored).not.toContain("Marco");
});

test("rejects unsupported filing steps through the localized unavailable state", async ({
  page,
}) => {
  const response = await page.goto("/en/file/unknown");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "The Bureau cannot locate this route." }),
  ).toBeVisible();
});

test("does not present direct navigation as a server-validated completion", async ({
  page,
}) => {
  await page.goto("/en/file/complete");
  await expect(page).toHaveURL(/\/en\/file\/review$/u);
  await expect(
    page.getByRole("heading", { name: "Confirm the submitted facts." }),
  ).toBeVisible();
});

test.describe("filing visual contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("mobile opening question", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/file/respondent");
    await expect(page).toHaveScreenshot("filing-respondent-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop completed review", async ({ page }) => {
    await page.addInitScript(
      ({ key, draft }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            locale: "en",
            updatedAt: Date.now(),
            draft,
          }),
        );
      },
      { key: storageKey, draft: completeDraft },
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/en/file/review");
    await expect(page.getByText("Draft restored")).toBeVisible();
    await expect(page).toHaveScreenshot("filing-review-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
