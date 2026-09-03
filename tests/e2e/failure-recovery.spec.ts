import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import type { ChronologyDraft } from "@/domain/filing/chronology";
import { GENERATION_IDEMPOTENCY_STORAGE_KEY } from "@/features/access/generation-idempotency";
import {
  FILING_DRAFT_STORAGE_KEY,
  serializeDraft,
} from "@/features/filing/draft-storage";
import { E2E_FAILURE_INSTRUCTION_HEADER } from "@/server/testing/e2e-failure-injection";

const completeDraft = {
  department: "chronology",
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

async function instructFailure(page: Page, instruction: string) {
  await page.setExtraHTTPHeaders({
    [E2E_FAILURE_INSTRUCTION_HEADER]: instruction,
  });
}

function consultationStorageKey(publicId: string): string {
  return `bpg:consultation:${publicId}:v1`;
}

async function readConsultationEnvelope(page: Page, publicId: string) {
  return page.evaluate((key) => {
    const value = window.localStorage.getItem(key);
    if (value === null) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed) ||
        !("participationKey" in parsed) ||
        typeof parsed.participationKey !== "string" ||
        !("position" in parsed) ||
        typeof parsed.position !== "string" ||
        !("submitted" in parsed) ||
        typeof parsed.submitted !== "boolean"
      ) {
        return null;
      }
      return {
        participationKey: parsed.participationKey,
        position: parsed.position,
        submitted: parsed.submitted,
      };
    } catch {
      return null;
    }
  }, consultationStorageKey(publicId));
}

test("recovers the primary journey from one-shot internal failures", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: FILING_DRAFT_STORAGE_KEY,
      value: serializeDraft(completeDraft, Date.now()),
    },
  );
  await instructFailure(page, "complete_filing:primary-recovery");
  await page.goto("/en/file/review");
  await expect(page.getByText("Draft restored")).toBeVisible();

  await page.getByRole("button", { name: "Submit for determination" }).click();
  await expect(
    page.getByRole("heading", {
      name: "The determination could not be completed.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Your safe filing remains preserved on this device. No determination was issued and no generation credit was consumed; you may try again or review the submitted facts.",
    ),
  ).toBeVisible();
  const originalGenerationKey = await page.evaluate(
    (key) => window.sessionStorage.getItem(key),
    GENERATION_IDEMPOTENCY_STORAGE_KEY,
  );
  expect(originalGenerationKey).toMatch(/^fil_[A-Za-z0-9_-]{22}$/u);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      FILING_DRAFT_STORAGE_KEY,
    ),
  ).toContain("Marco");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/en\/determination$/u);
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      GENERATION_IDEMPOTENCY_STORAGE_KEY,
    ),
  ).toBeNull();

  await instructFailure(page, "publish_public_record:primary-recovery");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the public record" }).click();
  await expect(
    page.getByText("The public record was not created."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This determination remains safe in the current tab. Check the persistence configuration or try again; no partial record was published.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review concerning Marco" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open the public record" }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole("button", { name: "Create the public record" }).click();
  await expect(
    page.getByRole("heading", { name: "The public record is available." }),
  ).toBeVisible();
  const publicAddress = await page
    .getByRole("link", { name: "Open the public record" })
    .getAttribute("href");
  if (publicAddress === null) {
    throw new Error("Publication retry must return a public address.");
  }
  const publicId = new URL(publicAddress).pathname.split("/").at(-1);
  if (publicId === undefined) {
    throw new Error("The public record address must contain an identifier.");
  }

  await instructFailure(page, "submit_public_consultation:primary-recovery");
  await page.goto(publicAddress);
  await expect(page.locator(".consultation-summary")).toContainText(
    "0 responses",
  );
  const selectedPosition = page.getByRole("button", {
    name: /Grievance upheld/u,
  });
  await selectedPosition.click();
  await expect(
    page.getByText(
      "Your position could not be recorded. It remains selected here so you can try again.",
    ),
  ).toBeVisible();
  await expect(selectedPosition).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".consultation-summary")).toContainText(
    "0 responses",
  );

  const failedEnvelope = await readConsultationEnvelope(page, publicId);
  expect(failedEnvelope).toMatchObject({
    position: "grievance_upheld",
    submitted: false,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await selectedPosition.click();
  await expect(
    page.getByText("Your position has been entered into the public record."),
  ).toBeVisible();
  await expect(page.locator(".consultation-summary")).toContainText(
    "1 response",
  );

  const submittedEnvelope = await readConsultationEnvelope(page, publicId);
  expect(submittedEnvelope).toMatchObject({
    participationKey: failedEnvelope?.participationKey,
    position: "grievance_upheld",
    submitted: true,
  });

  await page.reload();
  await expect(page.locator(".consultation-summary")).toContainText(
    "1 response",
  );
});
