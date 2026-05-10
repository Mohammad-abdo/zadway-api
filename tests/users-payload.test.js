import { describe, expect, it } from "vitest";
import { normalizeUserWritePayload, shapeUserForAdmin } from "../src/modules/users/users.service.js";

describe("normalizeUserWritePayload", () => {
  it("maps isActive to status and drops isActive", () => {
    const out = normalizeUserWritePayload({ name: "A", isActive: true });
    expect(out.isActive).toBeUndefined();
    expect(out.status).toBe("active");
    const out2 = normalizeUserWritePayload({ isActive: false });
    expect(out2.status).toBe("inactive");
  });

  it("removes empty password", () => {
    const out = normalizeUserWritePayload({ password: "", email: "x@y.z" });
    expect(out.password).toBeUndefined();
  });
});

describe("shapeUserForAdmin", () => {
  it("adds isActive from status", () => {
    expect(shapeUserForAdmin({ id: 1, status: "active" }).isActive).toBe(true);
    expect(shapeUserForAdmin({ id: 1, status: "inactive" }).isActive).toBe(false);
  });
});
