import { describe, expect, it } from "vitest";
import { parseListQuery } from "../src/core/utils/pagination.js";

describe("parseListQuery", () => {
  it("parses page/limit/sort safely", () => {
    const out = parseListQuery({ page: "2", limit: "25", sort: "id:asc" });
    expect(out.page).toBe(2);
    expect(out.limit).toBe(25);
    expect(out.skip).toBe(25);
    expect(out.take).toBe(25);
    expect(out.orderBy).toEqual({ id: "asc" });
  });

  it("builds OR filters for q over searchableFields", () => {
    const out = parseListQuery({ q: "ali" }, { searchableFields: ["name", "email"] });
    expect(out.where).toHaveProperty("OR");
    expect(out.where.OR).toHaveLength(2);
  });
});

