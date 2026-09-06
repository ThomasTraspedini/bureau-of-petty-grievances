import { expect, test } from "@playwright/test";

import { createEmptyChronologyDraft } from "@/domain/filing/chronology";
import {
  filingDraftStorageKey,
  serializeDraft,
} from "@/features/filing/draft-storage";

for (const locale of ["en", "it", "fr", "de", "es", "pt-BR"] as const) {
  test(`keeps timing units whole and chronology endpoints aligned (${locale})`, async ({
    page,
  }) => {
    const draft = {
      ...createEmptyChronologyDraft(),
      respondent: "Alex",
      relationship: "friend" as const,
      offence: "optimistic_estimate" as const,
    };
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      {
        key: filingDraftStorageKey(locale),
        value: serializeDraft(draft, Date.now(), locale),
      },
    );
    await page.goto(`/${locale}/file/chronology`);
    for (const width of [320, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      const units = page.locator(".timing-grid .field-unit");
      await expect(units).toHaveCount(2);
      await page.evaluate(() => document.fonts.ready);
      for (const unit of await units.all()) {
        const dimensions = await unit.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            lines: range.getClientRects().length,
            right: element.getBoundingClientRect().right,
          };
        });
        expect(dimensions.lines).toBe(1);
        expect(dimensions.right).toBeLessThanOrEqual(width);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page.goto(`/${locale}/example`);
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const endpoints = page.locator(".chronology-endpoint");
      await expect(endpoints).toHaveCount(2);
      const centers = await endpoints.evaluateAll((elements) =>
        elements.map((element) => {
          const style = getComputedStyle(element);
          const marker = getComputedStyle(element, "::before");
          const border = parseFloat(style.borderLeftWidth);
          const markerWidth =
            parseFloat(marker.width) +
            (marker.boxSizing === "border-box"
              ? 0
              : parseFloat(marker.borderLeftWidth) +
                parseFloat(marker.borderRightWidth));
          const left = element.getBoundingClientRect().left;
          return {
            line: left + border / 2,
            marker: left + border + parseFloat(marker.left) + markerWidth / 2,
          };
        }),
      );
      expect(centers).toHaveLength(2);
      for (const center of centers) {
        expect(center.marker).toBeCloseTo(center.line, 5);
        expect(center.marker).toBeCloseTo(centers[0]?.marker ?? NaN, 5);
      }
    }
  });
}
