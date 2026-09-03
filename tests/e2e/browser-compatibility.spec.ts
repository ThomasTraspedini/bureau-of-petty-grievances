import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, name: string) {
  await page.getByRole("radio", { name }).check();
  await page.getByRole("button", { name: "Continue" }).click();
}

test("preserves the essential journey across supported browser engines", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
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

  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/u);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/en/file/respondent");
  const alias = page.getByRole("textbox", { name: "Respondent alias" });
  await alias.fill("Casey");
  await page.reload();
  await expect(page.getByText("Draft restored")).toBeVisible();
  await expect(alias).toHaveValue("Casey");
  await page.getByRole("button", { name: "Continue" }).click();

  const friend = page.getByRole("radio", { name: "Friend" });
  await friend.focus();
  await page.keyboard.press("Space");
  await expect(friend).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(
    page,
    "Chronology Promises, estimates, arrivals, and measurable delays.",
  );
  await choose(
    page,
    "Declared “leaving now” before being ready Measure the time between the declaration and actual readiness.",
  );

  await page.getByLabel("Time “leaving now” was declared").fill("18:15");
  await page.getByLabel("Recorded delay").fill("18");
  await page.getByRole("button", { name: "Continue" }).click();
  await choose(page, "A table or reservation was held");
  await choose(page, "Usually brings dessert");
  await page
    .getByRole("textbox", { name: "Submitted statement" })
    .fill("The departure notice arrived before the shoes did.");
  await page.getByRole("button", { name: "Review the record" }).click();

  await expect(
    page.getByRole("heading", { name: "Confirm the submitted facts." }),
  ).toBeVisible();
  await expect(page.locator("main")).toBeInViewport();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("button", { name: "Submit for determination" }).click();
  await expect(
    page.getByRole("heading", { name: "Review concerning Casey" }),
  ).toBeVisible();
  await expect(page.getByText("18 minutes later")).toBeVisible();
  const revealDuration = await page
    .locator(".determination-record")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );
  expect(revealDuration).toBeLessThan(0.001);

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (!publicAddress) {
    throw new Error("Cross-browser publication must return a public address.");
  }

  await page.goto(publicAddress);
  await expect(
    page.getByRole("heading", { name: "Review concerning Casey" }),
  ).toBeVisible();
  await expect(page.locator(".consultation-summary")).toContainText(
    "0 responses",
  );
  await page.getByRole("button", { name: /Grievance upheld/u }).click();
  await expect(
    page.getByText("Your position has been entered into the public record."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Grievance upheld/u }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Share determination" }).click();
  await expect(
    page.getByText(
      "Automatic copying is unavailable. Select and copy the public address shown above.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Public record address")).toBeFocused();
  await expect(page.getByLabel("Public record address")).toHaveValue(
    publicAddress,
  );

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/en");
  await expect(
    page.getByRole("heading", {
      name: "Harmony, administered.",
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toBeInViewport();
});
