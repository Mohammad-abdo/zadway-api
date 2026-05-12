import { describe, expect, it } from "vitest";
import {
  enrichCatalogVariant,
  resolveVariantImages,
} from "../src/core/utils/variantImages.js";

describe("resolveVariantImages", () => {
  it("uses variant hero and gallery when set", () => {
    const out = resolveVariantImages(
      { imageUrl: "https://p.com/a.jpg", images: ["https://p.com/x.jpg"] },
      { imageUrl: "https://v.com/b.jpg", images: ["https://v.com/y.jpg"] },
    );
    expect(out.displayImageUrl).toBe("https://v.com/b.jpg");
    expect(out.displayImages).toEqual(["https://v.com/y.jpg"]);
  });

  it("falls back to product when variant media missing", () => {
    const out = resolveVariantImages(
      { imageUrl: "https://p.com/a.jpg", images: ["https://p.com/g1.jpg"] },
      { imageUrl: null, images: null },
    );
    expect(out.displayImageUrl).toBe("https://p.com/a.jpg");
    expect(out.displayImages).toEqual(["https://p.com/g1.jpg"]);
  });

  it("falls back when variant gallery is empty array", () => {
    const out = resolveVariantImages(
      { imageUrl: "https://p.com/a.jpg", images: ["https://p.com/g1.jpg"] },
      { imageUrl: "https://v.com/b.jpg", images: [] },
    );
    expect(out.displayImageUrl).toBe("https://v.com/b.jpg");
    expect(out.displayImages).toEqual(["https://p.com/g1.jpg"]);
  });
});

describe("enrichCatalogVariant", () => {
  it("adds display fields", () => {
    const v = enrichCatalogVariant(
      { imageUrl: "https://p.com/a.jpg", images: ["https://p.com/g.jpg"] },
      { id: 1, sku: "X" },
    );
    expect(v.displayImageUrl).toBe("https://p.com/a.jpg");
    expect(v.displayImages).toEqual(["https://p.com/g.jpg"]);
  });
});
