import { describe, expect, it } from "vitest";
import { stripAccessToken } from "../src/modules/client/client.service.js";

describe("stripAccessToken", () => {
  it("removes accessToken from order object", () => {
    const row = { id: 1, accessToken: "secret", total: 10 };
    const out = stripAccessToken(row);
    expect(out).toEqual({ id: 1, total: 10 });
    expect("accessToken" in out).toBe(false);
  });
});
