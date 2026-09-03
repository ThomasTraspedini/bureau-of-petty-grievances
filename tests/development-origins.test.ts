import { describe, expect, it } from "vitest";

import { parseAllowedDevOrigins } from "@/config/development-origins";

describe("development origin configuration", () => {
  it("keeps exact comma-separated LAN hosts and removes duplicates", () => {
    expect(
      parseAllowedDevOrigins(" 192.168.1.122, bureau.local,192.168.1.122 "),
    ).toEqual(["192.168.1.122", "bureau.local"]);
  });

  it("omits the setting when no LAN host is configured", () => {
    expect(parseAllowedDevOrigins(undefined)).toBeUndefined();
    expect(parseAllowedDevOrigins("  ")).toBeUndefined();
  });

  it.each([
    "http://192.168.1.122",
    "192.168.1.122:3000",
    "192.168.1.122/path",
    "*.example.test",
  ])("rejects a non-hostname development origin: %s", (value) => {
    expect(() => parseAllowedDevOrigins(value)).toThrow(
      "BUREAU_ALLOWED_DEV_ORIGINS",
    );
  });
});
