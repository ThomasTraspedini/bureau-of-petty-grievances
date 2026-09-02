import AxeBuilder from "@axe-core/playwright";

const EVALUATION_TOKEN = `eva_${"E".repeat(43)}`;
const STANDARD_TOKEN = `std_${"S".repeat(43)}`;
import { expect, test } from "@playwright/test";

test("redirects the root to the explicit English locale", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("renders localized metadata and passes an automated accessibility scan", async ({
  page,
}) => {
  await page.goto("/en");

  await expect(page).toHaveTitle(
    "Bureau of Petty Grievances — Harmony, administered.",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Submit a harmless recurring grievance and receive a fair, shareable determination.",
  );

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("exchanges evaluator access from a clean address without retaining the credential", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.7" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/en/evaluate#${EVALUATION_TOKEN}`);
  await expect(page.getByText("Evaluation access confirmed")).toBeVisible();
  await expect(page).toHaveURL(
    /\/en\/file\/respondent\?notice=evaluation-access$/u,
  );
  expect(page.url()).not.toContain(EVALUATION_TOKEN);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "bpg_evaluation_session_v1",
  );
  const cookies = await context.cookies();
  expect(
    cookies.find((cookie) => cookie.name === "bpg_evaluation_session_v1"),
  ).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  await page.getByRole("textbox", { name: "Respondent alias" }).blur();
  expect(
    await page.screenshot({ animations: "disabled", fullPage: true }),
  ).toMatchSnapshot("evaluation-access-mobile.png");
});

test("renders a localized invalid evaluator address without indexing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/evaluate#invalid");
  await expect(
    page.getByRole("heading", {
      name: "This evaluation address cannot open a session.",
    }),
  ).toBeVisible();
  expect(page.url()).not.toContain("#invalid");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/u,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.screenshot({ animations: "disabled", fullPage: true }),
  ).toMatchSnapshot("evaluation-access-desktop.png");
});

test("redeems one standard authorization without retaining its credential", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.17" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/en/access#${STANDARD_TOKEN}`);
  await expect(
    page.getByRole("heading", { name: "Your filing authority is ready." }),
  ).toBeVisible();
  await expect(page.getByText("5 of 5").first()).toBeVisible();
  expect(page.url()).not.toContain(STANDARD_TOKEN);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "bpg_standard_session_v1",
  );
  const cookies = await context.cookies();
  expect(
    cookies.find((cookie) => cookie.name === "bpg_standard_session_v1"),
  ).toMatchObject({ httpOnly: true, sameSite: "Lax" });
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/u,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.screenshot({ animations: "disabled", fullPage: true }),
  ).toMatchSnapshot("standard-access-mobile.png");
});

test("loads the production shell without external asset requests", async ({
  page,
}) => {
  const externalRequests: string[] = [];

  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== "http://127.0.0.1:4173") {
      externalRequests.push(requestUrl.origin);
    }
  });

  await page.goto("/en", { waitUntil: "networkidle" });
  expect(externalRequests).toEqual([]);
});

test("rejects an unsupported locale through the localized unavailable state", async ({
  page,
}) => {
  const response = await page.goto("/fr");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "The Bureau cannot locate this route.",
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("shows a keyboard-visible skip link", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "Skip to the main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
});

test("honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");

  const statusDot = page.locator(".status-dot");
  const duration = await statusDot.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).animationDuration),
  );
  expect(duration).toBeLessThan(0.001);
  await expect(statusDot).toHaveCSS("animation-iteration-count", "1");
});

test.describe("visual contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("mobile application shell", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en");

    await expect(page).toHaveScreenshot("application-shell-mobile.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop application shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/en");

    await expect(page).toHaveScreenshot("application-shell-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });

  test("desktop standard authorization", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "bpg_standard_session_v1",
        value: `sts_${"V".repeat(43)}`,
        url: "http://127.0.0.1:4173",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/en/access");
    await expect(
      page.getByRole("heading", { name: "Your filing authority is ready." }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("standard-access-desktop.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  });
});
