import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { assessChronologyFiling } from "@/domain/determination/chronology-assessment";
import { DETERMINATION_EXPERIENCE_VERSION } from "@/domain/determination/determination-experience";
import { createChronologyDeterminationLanguageCommand } from "@/domain/determination/determination-language";
import { createEnglishChronologyFallback } from "@/domain/determination/locales/en";
import {
  type ChronologyDraft,
  validateChronologyDraft,
} from "@/domain/filing/chronology";
import {
  DETERMINATION_SESSION_KEY,
  serializeDeterminationSession,
} from "@/features/determination/determination-session";

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
} satisfies ChronologyDraft;

async function choose(page: Page, name: string) {
  await page.getByRole("radio", { name }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

function fixedDeterminationSession(): string {
  const validation = validateChronologyDraft(completeDraft, "en");
  if (validation.status === "invalid") {
    throw new Error("The end-to-end filing fixture must remain valid.");
  }
  const assessment = assessChronologyFiling(validation.filing);
  const command = createChronologyDeterminationLanguageCommand(
    validation.filing,
    assessment,
  );
  if (command.status === "invalid") {
    throw new Error("The end-to-end assessment must match its filing.");
  }
  return serializeDeterminationSession(
    completeDraft,
    {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: "en",
      reference: "CHR · 2026 · A1B2C3",
      issuedAt: "2026-09-02T12:00:00.000Z",
      assessment,
      language: createEnglishChronologyFallback(command.command),
    },
    Date.now(),
  );
}

async function openFixedDetermination(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      window.sessionStorage.setItem(key, value);
    },
    { key: DETERMINATION_SESSION_KEY, value: fixedDeterminationSession() },
  );
  await page.goto("/en/determination");
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
}

test("completes, corrects, and receives a Chronology determination", async ({
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

  await page.getByRole("button", { name: "Submit for determination" }).click();
  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByRole("heading", {
      name: "Review concerning Marco",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Upheld, with circumstances noted"),
  ).toBeVisible();
  await expect(page.getByText("24 minutes later")).toBeVisible();
  await expect(page.getByText("Departure language protocol")).toBeVisible();
  await expect(page.getByText("not a public record")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
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
    ({ key, seededKey, draft }) => {
      if (window.sessionStorage.getItem(seededKey) !== null) return;
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          locale: "en",
          updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
          draft,
        }),
      );
      window.sessionStorage.setItem(seededKey, "true");
    },
    {
      key: storageKey,
      seededKey: "bpg:test:expired-draft-seeded",
      draft: completeDraft,
    },
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

test("returns direct determination navigation to the preserved review", async ({
  page,
}) => {
  await page.goto("/en/determination");
  await expect(page).toHaveURL(
    /\/en\/file\/review\?notice=determination-unavailable$/u,
  );
  await expect(
    page.getByText("No current determination in this tab"),
  ).toBeVisible();
});

test("renders an accessible immediate determination under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFixedDetermination(page);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/u,
  );
  const duration = await page
    .locator(".determination-record")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );
  expect(duration).toBeLessThan(0.001);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
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

  test("mobile determination", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixedDetermination(page);
    await expect(page).toHaveScreenshot("determination-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop determination", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFixedDetermination(page);
    await expect(page).toHaveScreenshot("determination-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
