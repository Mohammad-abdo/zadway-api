import { describe, expect, it } from "vitest";
import { assertOrderStatusTransition } from "../src/modules/product-orders/product-orders.service.js";

describe("assertOrderStatusTransition", () => {
  it("allows DELIVERED from ACCEPTED (legacy path)", () => {
    expect(() => assertOrderStatusTransition("NEW", "DELIVERED")).toThrow();
    expect(() => assertOrderStatusTransition("ACCEPTED", "DELIVERED")).not.toThrow();
  });

  it("allows fulfillment path ACCEPTED → PICKED_UP → ON_THE_WAY → DELIVERED", () => {
    expect(() => assertOrderStatusTransition("ACCEPTED", "PICKED_UP")).not.toThrow();
    expect(() => assertOrderStatusTransition("PICKED_UP", "ON_THE_WAY")).not.toThrow();
    expect(() => assertOrderStatusTransition("ON_THE_WAY", "DELIVERED")).not.toThrow();
  });

  it("blocks changes after DELIVERED", () => {
    expect(() => assertOrderStatusTransition("DELIVERED", "ACCEPTED")).toThrow();
  });

  it("allows CANCELLED from in-progress statuses", () => {
    expect(() => assertOrderStatusTransition("ACCEPTED", "CANCELLED")).not.toThrow();
    expect(() => assertOrderStatusTransition("ON_THE_WAY", "CANCELLED")).not.toThrow();
  });

  it("blocks CANCELLED after DELIVERED", () => {
    expect(() => assertOrderStatusTransition("DELIVERED", "CANCELLED")).toThrow();
  });

  it("allows noop", () => {
    expect(() => assertOrderStatusTransition("PENDING", "PENDING")).not.toThrow();
  });
});
