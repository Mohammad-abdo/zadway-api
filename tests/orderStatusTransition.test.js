import { describe, expect, it } from "vitest";
import { assertOrderStatusTransition } from "../src/modules/product-orders/product-orders.service.js";

describe("assertOrderStatusTransition", () => {
  it("allows DELIVERED only from ACCEPTED", () => {
    expect(() => assertOrderStatusTransition("NEW", "DELIVERED")).toThrow();
    expect(() => assertOrderStatusTransition("ACCEPTED", "DELIVERED")).not.toThrow();
  });

  it("blocks changes after DELIVERED", () => {
    expect(() => assertOrderStatusTransition("DELIVERED", "ACCEPTED")).toThrow();
  });

  it("allows noop", () => {
    expect(() => assertOrderStatusTransition("PENDING", "PENDING")).not.toThrow();
  });
});
