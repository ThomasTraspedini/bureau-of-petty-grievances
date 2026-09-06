import { describe, expect, it } from "vitest";

import { remedyStampPlacement } from "@/features/determination/remedy-stamp-placement";

describe("remedy stamp placement", () => {
  it("varies each axis across determinations while remaining deterministic and safe", () => {
    const horizontal = new Set<number>();
    const vertical = new Set<number>();
    const rotations = new Set<number>();
    for (let index = 0; index < 1000; index += 1) {
      const snapshot = {
        reference: `CHR · 2026 · ${String(index).padStart(6, "0")}`,
        issuedAt: "2026-09-02T12:00:00.000Z",
      };
      const placement = remedyStampPlacement(snapshot);
      expect(remedyStampPlacement({ ...snapshot })).toEqual(placement);
      expect(Math.abs(placement.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(placement.y)).toBeLessThanOrEqual(4);
      expect(placement.rotation).toBeGreaterThanOrEqual(-10);
      expect(placement.rotation).toBeLessThanOrEqual(-4);
      horizontal.add(placement.x);
      vertical.add(placement.y);
      rotations.add(placement.rotation);

      // Full image bounds, even before its transparent margins: both layouts
      // retain clearance from text (24px gap) and section edges (40px padding).
      for (const size of [82, 96]) {
        const angle = (Math.abs(placement.rotation) * Math.PI) / 180;
        const overhang = (size * (Math.cos(angle) + Math.sin(angle) - 1)) / 2;
        expect(overhang + Math.abs(placement.x)).toBeLessThan(13);
        expect(overhang + Math.abs(placement.y)).toBeLessThan(13);
      }
    }
    expect(horizontal.size).toBe(11);
    expect(vertical.size).toBe(9);
    expect(rotations.size).toBe(7);
  });
});
