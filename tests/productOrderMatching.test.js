import { describe, expect, it } from "vitest";
import {
  haversineKm,
  intersectSets,
  parseCoord,
} from "../src/services/productOrders/productOrderMatching.js";

describe("productOrderMatching", () => {
  it("parseCoord parses numeric strings", () => {
    expect(parseCoord("24.5")).toBe(24.5);
    expect(parseCoord("")).toBe(null);
    expect(parseCoord(null)).toBe(null);
  });

  it("intersectSets returns common elements", () => {
    const a = new Set([1, 2, 3]);
    const b = new Set([2, 3, 4]);
    expect([...intersectSets(a, b)].sort()).toEqual([2, 3]);
  });

  it("haversineKm is small for nearby points", () => {
    const d = haversineKm(24.7136, 46.6753, 24.72, 46.68);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(5);
  });
});
