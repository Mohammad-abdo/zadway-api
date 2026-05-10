import { describe, expect, it } from "vitest";
import { getAdminMeta } from "../src/modules/admin-meta/admin-meta.service.js";

describe("admin meta", () => {
  it("returns stable status options", () => {
    const meta = getAdminMeta();
    expect(meta).toHaveProperty("version");
    expect(meta.statusOptions.productOrders).toContain("NEW");
    expect(meta.statusOptions.productOrders).toContain("DELIVERED");
    expect(meta.statusOptions.productOrderOffers).toContain("PENDING");
  });
});

