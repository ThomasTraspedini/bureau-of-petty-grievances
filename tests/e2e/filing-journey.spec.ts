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

declare global {
  interface Window {
    __bureauSharePayload?: ShareData;
  }
}

const storageKey = "bpg:filing:chronology:en:v1";

test.describe.configure({ mode: "serial" });

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
  const issuedAt = new Date();
  issuedAt.setMilliseconds(0);
  return serializeDeterminationSession(
    completeDraft,
    {
      experienceVersion: DETERMINATION_EXPERIENCE_VERSION,
      locale: "en",
      reference: "CHR · 2026 · A1B2C3",
      issuedAt: issuedAt.toISOString(),
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

async function publishFixedRecord(page: Page) {
  await openFixedDetermination(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  await expect(
    page.getByRole("heading", { name: "The public record is available." }),
  ).toBeVisible();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  const ownerAddress = await page
    .getByRole("link", { name: "Open owner controls" })
    .getAttribute("href");
  if (publicAddress === null || ownerAddress === null) {
    throw new Error(
      "Publication must return separate public and owner addresses.",
    );
  }
  return { publicAddress, ownerAddress };
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
  const publicAccessibility = await new AxeBuilder({ page }).analyze();
  expect(publicAccessibility.violations).toEqual([]);
  const duration = await page
    .locator(".determination-record")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );
  expect(duration).toBeLessThan(0.001);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("publishes, reports, unpublishes, restores, and deletes a public record", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { publicAddress, ownerAddress } = await publishFixedRecord(page);
  expect(publicAddress).not.toContain("owner=");
  expect(ownerAddress).toContain("#owner=own_");

  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: (payload: ShareData) => {
        window.__bureauSharePayload = payload;
        return Promise.resolve();
      },
    });
  });

  const publicResponse = await page.goto(publicAddress);
  expect(publicResponse?.headers()["cache-control"]).toContain("no-store");
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
  await expect(
    page.getByText("Unlisted public record · noindex"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/u,
  );
  expect(page.url()).not.toContain("owner=");
  const publicSource = await page.content();
  expect(publicSource).not.toContain('"relationship":"friend"');
  expect(publicSource).not.toContain("ownerCredential");
  const head = await page.locator("head").innerHTML();
  expect(head).toContain("Premature departure — Bureau of Petty Grievances");
  expect(head).toContain("summary_large_image");
  expect(head).not.toContain("Marco");
  expect(head).not.toContain("19:30");
  expect(head).not.toContain("looking for his shoes");
  expect(head).not.toContain("owner=");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    publicAddress,
  );
  const socialImageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  if (socialImageUrl === null) {
    throw new Error("Available records must emit a social image.");
  }
  expect(socialImageUrl).toContain("/social-image?v=");
  const socialImage = await page.request.get(socialImageUrl);
  expect(socialImage.status()).toBe(200);
  expect(socialImage.headers()["content-type"]).toContain("image/png");
  expect(socialImage.headers()["cache-control"]).toContain("no-store");
  expect(socialImage.headers()["x-robots-tag"]).toContain("noimageindex");
  expect((await socialImage.body()).byteLength).toBeGreaterThan(10_000);

  await page.getByRole("button", { name: "Share determination" }).click();
  await expect(
    page.getByText("The device sharing options are open."),
  ).toBeVisible();
  const sharePayload: unknown = await page.evaluate(
    () => window.__bureauSharePayload,
  );
  expect(sharePayload).toEqual({
    title: "Bureau determination · CHR · 2026 · A1B2C3",
    text: "Premature departure. A 24-minute discrepancy. Mitigation entered: dessert is usually brought.",
    url: publicAddress,
  });
  expect(JSON.stringify(sharePayload)).not.toContain("owner=");
  await page
    .getByRole("radio", { name: "It exposes private information" })
    .check();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(
    page.getByText("Report received for Bureau review."),
  ).toBeVisible();

  const ownerResponse = await page.goto(ownerAddress);
  expect(ownerResponse?.headers()["cache-control"]).toContain("no-store");
  await expect(page).not.toHaveURL(/owner=/u);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/u,
  );
  await expect(
    page.getByText("Published", { exact: true }).last(),
  ).toBeVisible();
  const managementAccessibility = await new AxeBuilder({ page }).analyze();
  expect(managementAccessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Unpublish the record" }).click();
  await expect(page.getByText("Unpublished by owner")).toBeVisible();
  expect(
    (
      await page.request.get(socialImageUrl, {
        headers: { "cache-control": "no-cache", pragma: "no-cache" },
      })
    ).status(),
  ).toBe(404);

  const publicPage = await page.context().newPage();
  await publicPage.goto(publicAddress);
  await expect(
    publicPage.getByRole("heading", {
      name: "This determination is not publicly available.",
    }),
  ).toBeVisible();
  const unavailableHead = await publicPage.locator("head").innerHTML();
  expect(unavailableHead).toContain(
    "Public record — Bureau of Petty Grievances",
  );
  expect(unavailableHead).not.toContain("Premature departure");
  expect(unavailableHead).not.toContain("24-minute discrepancy");
  await expect(publicPage.locator('meta[property="og:image"]')).toHaveCount(0);
  await publicPage.close();

  await page.getByRole("button", { name: "Restore public access" }).click();
  await expect(
    page.getByText("Published", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByText("This cannot be undone.")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm permanent deletion" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "The public record was permanently deleted.",
    }),
  ).toBeVisible();
  await page.goto(publicAddress);
  await expect(
    page.getByRole("heading", {
      name: "This determination is not publicly available.",
    }),
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

  test("mobile public record", async ({ page }) => {
    const { publicAddress } = await publishFixedRecord(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(publicAddress);
    await expect(page).toHaveScreenshot("public-record-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop public record", async ({ page }) => {
    const { publicAddress } = await publishFixedRecord(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(publicAddress);
    await expect(page).toHaveScreenshot("public-record-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("social preview image", async ({ page }) => {
    const { publicAddress } = await publishFixedRecord(page);
    await page.goto(publicAddress);
    const socialImageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    if (socialImageUrl === null) {
      throw new Error("The social preview fixture must expose an image.");
    }
    await page.setContent(
      `<style>*{box-sizing:border-box}html,body{margin:0}img{display:block;width:1200px;height:630px}</style><img src="${socialImageUrl}" alt="">`,
    );
    await expect(page.locator("img")).toHaveScreenshot("social-preview.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("mobile owner controls", async ({ page }) => {
    const { ownerAddress } = await publishFixedRecord(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ownerAddress);
    await expect(
      page.getByText("Published", { exact: true }).last(),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("owner-controls-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
