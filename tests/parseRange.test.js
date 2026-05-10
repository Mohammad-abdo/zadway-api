import { describe, expect, it } from "vitest";
import { parseUtcRangeInclusive, utcDayStart } from "../src/modules/admin-reports/parseRange.js";

describe("parseUtcRangeInclusive", () => {
  it("parses inclusive end into exclusive upper bound", () => {
    const { from, toExclusive } = parseUtcRangeInclusive("2026-01-10", "2026-01-12");
    expect(from.toISOString()).toBe("2026-01-10T00:00:00.000Z");
    expect(toExclusive.toISOString()).toBe("2026-01-13T00:00:00.000Z");
  });

  it("rejects inverted range", () => {
    expect(() => parseUtcRangeInclusive("2026-02-01", "2026-01-01")).toThrow();
  });

  it("utcDayStart rejects bad format", () => {
    expect(() => utcDayStart("")).toThrow();
    expect(() => utcDayStart("2026/01/01")).toThrow();
  });
});
