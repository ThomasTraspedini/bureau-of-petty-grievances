import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { pseudoLocalize } from "@/i18n/pseudo";
import messages from "../../messages/en.json" with { type: "json" };

const pseudoHeader = { "x-bureau-e2e-pseudo-localization": "1" };
const standardSession = `sts_${"T".repeat(43)}`;

test.describe.configure({ mode: "serial" });
test.use({
  extraHTTPHeaders: pseudoHeader,
  viewport: { width: 320, height: 844 },
});

async function submitCurrentStep(page: Page) {
  await page.locator('form button[type="submit"]').click();
}

async function chooseAndContinue(page: Page, name: string, value: string) {
  await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await submitCurrentStep(page);
}

async function expectNarrowLayout(
  page: Page,
  essentialActions: Locator = page.locator(
    "a.button:visible, button.button:visible, input:visible, textarea:visible",
  ),
) {
  await page.evaluate(async () => document.fonts.ready);
  const layout = await page.evaluate(() => {
    const width = window.innerWidth;
    const rootWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const overflowingElements = Array.from(document.body.querySelectorAll("*"))
      .filter((element) => {
        const rectangle = element.getBoundingClientRect();
        return rectangle.left < -1 || rectangle.right > width + 1;
      })
      .slice(0, 12)
      .map((element) => {
        const rectangle = element.getBoundingClientRect();
        return `${element.tagName.toLocaleLowerCase("en")}.${element.getAttribute("class") ?? ""} at ${String(rectangle.left)}–${String(rectangle.right)}`;
      });
    const clippedBoundaries = [
      ".hero",
      ".filing-card",
      ".determination-record",
      ".public-record-panel",
      ".access-card",
    ]
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element) => {
        const node = element as HTMLElement;
        return node.scrollWidth > node.clientWidth + 1;
      })
      .map((element) => element.getAttribute("class") ?? "");

    return {
      width,
      rootWidth,
      bodyWidth,
      clippedBoundaries,
      overflowingElements,
    };
  });

  expect(layout.rootWidth, JSON.stringify(layout, null, 2)).toBeLessThanOrEqual(
    layout.width + 1,
  );
  expect(layout.bodyWidth, JSON.stringify(layout, null, 2)).toBeLessThanOrEqual(
    layout.width + 1,
  );
  expect(layout.clippedBoundaries).toEqual([]);

  const clippedActions = await essentialActions.evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rectangle = element.getBoundingClientRect();
      return rectangle.left < -1 || rectangle.right > window.innerWidth + 1
        ? [
            `${element.tagName.toLocaleLowerCase("en")}.${element.getAttribute("class") ?? ""} at ${String(rectangle.left)}–${String(rectangle.right)}`,
          ]
        : [];
    }),
  );
  expect(clippedActions).toEqual([]);
}

async function expectAccessible(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test("keeps the pseudo-localized filing, determination, and public record usable at 320 pixels", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.Home.title),
    }),
  ).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);
  await expect(page).toHaveScreenshot("pseudo-localized-landing-320.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.01,
  });

  await page
    .getByRole("link", { name: pseudoLocalize(messages.Home.secondaryAction) })
    .click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.Determination.title).replace(
        "{respondent}",
        pseudoLocalize(messages.Example.respondent),
      ),
    }),
  ).toBeVisible();
  await expect(
    page.getByText(pseudoLocalize(messages.Example.boundaryTitle)),
  ).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);

  await page.goto("/en/file/respondent");
  await page.locator("#respondent").fill("Casey");
  await submitCurrentStep(page);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.Filing.relationshipTitle).replace(
        "{respondent}",
        "Casey",
      ),
    }),
  ).toBeVisible();
  await chooseAndContinue(page, "relationship", "friend");
  await chooseAndContinue(page, "department", "chronology");
  await chooseAndContinue(page, "offence", "premature_departure");
  await page.locator('input[type="time"]').fill("18:15");
  await page.locator('input[type="number"]').fill("18");
  await submitCurrentStep(page);
  await chooseAndContinue(page, "impact", "table_held");
  await chooseAndContinue(page, "mitigation", "brings_dessert");
  await page
    .locator("#statement")
    .fill("The departure notice arrived before the shoes did.");
  await submitCurrentStep(page);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.Filing.reviewTitle),
    }),
  ).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);

  await page.locator(".filing-actions button.button-primary").click();
  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.Determination.title).replace(
        "{respondent}",
        "Casey",
      ),
    }),
  ).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);

  const publication = page.locator(".public-record-panel").first();
  await publication.locator('input[type="checkbox"]').check();
  await publication.locator("button.button-primary").click();
  const publicationSuccess = publication.locator(".public-record-success");
  await expect(publicationSuccess).toBeVisible();
  const publicAddress = await publicationSuccess
    .locator("a")
    .first()
    .getAttribute("href");
  const ownerAddress = await publicationSuccess
    .locator("a")
    .nth(1)
    .getAttribute("href");
  if (!publicAddress || !ownerAddress) {
    throw new Error("Publication must return public and owner addresses.");
  }
  await expectNarrowLayout(page);

  await page.goto(publicAddress);
  await expect(page.locator(".consultation-summary")).toContainText("0");
  await expectNarrowLayout(page);
  await expectAccessible(page);
  // Normalize runtime record values only for the visual comparison.
  await page.locator(".determination-shell").evaluate((element) => {
    element.setAttribute("data-variant", "1");
  });
  await page
    .locator(".determination-metadata > div:first-child strong")
    .evaluate((element) => {
      element.textContent = "CHR · 2026 · ABC123";
    });
  await page
    .locator(".determination-metadata > div:nth-child(2) strong")
    .evaluate((element) => {
      element.textContent = "Sep 3, 2026";
    });
  await page
    .locator(".determination-metadata > div:nth-child(3) strong")
    .evaluate((element) => {
      element.textContent = "Sep 3, 2026";
    });
  await page
    .locator(".determination-metadata > div:nth-child(4) strong")
    .evaluate((element) => {
      element.textContent = "Oct 3, 2026";
    });
  await page.locator(".remedy-stamp").evaluate((element) => {
    element.setAttribute(
      "style",
      "transform: translate(0px, 0px) rotate(0deg)",
    );
  });
  await expect(page).toHaveScreenshot(
    "pseudo-localized-public-record-320.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    },
  );

  await page.locator(".consultation-option").first().click();
  await expect(page.locator(".consultation-option").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator(".sharing-panel .button-primary").click();
  await expect(page.locator(".sharing-status")).toContainText(
    pseudoLocalize(messages.Sharing.manualStatus),
  );
  await expect(page.locator("#public-share-address")).toBeFocused();
  await expectNarrowLayout(page);

  await page.goto(ownerAddress);
  await expect(page.locator("#manage-title")).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);
});

test("keeps pseudo-localized access states operable at 320 pixels", async ({
  context,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await context.addCookies([
    {
      name: "bpg_standard_session_v1",
      value: standardSession,
      url: "http://127.0.0.1:4173",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/en/access");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.StandardAccess.activeTitle),
    }),
  ).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);

  await page.goto("/en/evaluate");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: pseudoLocalize(messages.Access.invalidTitle),
    }),
  ).toBeVisible();
  await expectNarrowLayout(page);
  await expectAccessible(page);
});
