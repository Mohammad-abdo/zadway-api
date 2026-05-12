/**
 * Normalize gallery JSON from DB (array of URL strings).
 * @param {unknown} value
 * @returns {string[] | null}
 */
function normalizeGallery(value) {
  if (value == null) return null;
  if (Array.isArray(value) && value.length > 0) return value.map((x) => String(x));
  return null;
}

/**
 * Resolved media for a variant: use variant-specific hero + gallery when set,
 * otherwise fall back to the parent product.
 *
 * @param {{ imageUrl?: string | null; images?: unknown }} product
 * @param {{ imageUrl?: string | null; images?: unknown }} variant
 * @returns {{ displayImageUrl: string; displayImages: string[] | null }}
 */
export function resolveVariantImages(product, variant) {
  const p = product && typeof product === "object" ? product : {};
  const v = variant && typeof variant === "object" ? variant : {};

  const vHero = v.imageUrl != null ? String(v.imageUrl).trim() : "";
  const pHero = p.imageUrl != null ? String(p.imageUrl).trim() : "";
  const displayImageUrl = (vHero !== "" ? vHero : pHero) || "";

  const displayImages = normalizeGallery(v.images) ?? normalizeGallery(p.images) ?? null;

  return { displayImageUrl, displayImages };
}

/**
 * Adds `displayImageUrl` and `displayImages` to a variant object (mutates copy).
 * Use when the parent `product` is known (e.g. catalog) but `variant` has no nested `product`.
 *
 * @param {{ imageUrl?: string | null; images?: unknown }} product
 * @param {Record<string, unknown>} variant
 */
export function enrichCatalogVariant(product, variant) {
  const { displayImageUrl, displayImages } = resolveVariantImages(product, variant);
  return { ...variant, displayImageUrl, displayImages };
}

/**
 * When `variant` includes nested `product`, attach display fields for API consumers.
 *
 * @param {Record<string, unknown> & { product?: { imageUrl?: string | null; images?: unknown } }} variant
 */
export function enrichVariantWithNestedProduct(variant) {
  if (!variant || typeof variant !== "object") return variant;
  const product = variant.product && typeof variant.product === "object" ? variant.product : {};
  const { displayImageUrl, displayImages } = resolveVariantImages(product, variant);
  return { ...variant, displayImageUrl, displayImages };
}

/**
 * @param {Record<string, unknown> & { variant?: Record<string, unknown> }} line
 */
export function enrichOrderLineItem(line) {
  if (!line || typeof line !== "object" || !line.variant) return line;
  return { ...line, variant: enrichVariantWithNestedProduct(line.variant) };
}
