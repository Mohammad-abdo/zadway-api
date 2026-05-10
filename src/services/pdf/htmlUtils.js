import { loadLogoBuffer } from "./pdfLogo.js";

/**
 * Escape arbitrary text so it is safe to interpolate inside HTML element
 * bodies and double-quoted attributes.
 * @param {unknown} value
 */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format a number with two decimals, swallowing nulls/NaN.
 * @param {unknown} n
 */
export function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

/**
 * Load the branding logo and turn it into a data: URI suitable for an `<img>`
 * `src`. Returns `null` when no logo is configured or the fetch fails.
 * @param {string | null | undefined} logoUrl
 */
export async function logoDataUri(logoUrl) {
  const buf = await loadLogoBuffer(logoUrl);
  if (!buf) return null;
  const mime = sniffImageMime(buf) ?? "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** @param {Buffer} buf */
function sniffImageMime(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  if (buf.length >= 5 && buf[0] === 0x3c && /svg/i.test(buf.slice(0, 200).toString("utf8"))) {
    return "image/svg+xml";
  }
  return null;
}

/**
 * Theme colors and shared CSS used by every report template. Browser handles
 * BIDI/shaping natively, so the templates only need `dir="rtl"` for Arabic.
 *
 * @param {"en" | "ar"} lang
 */
export function baseDocumentCss(lang) {
  const fontStack =
    lang === "ar"
      ? `'AppArabic', 'AppLatin', 'Segoe UI', Tahoma, Arial, sans-serif`
      : `'AppLatin', 'AppArabic', 'Segoe UI', Tahoma, Arial, sans-serif`;
  return `
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  font-family: ${fontStack};
  color: #0F172A;
  font-size: 11px;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body { padding: 0; }
h1, h2, h3, h4 { margin: 0; font-weight: 700; color: #0F172A; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 7px 10px; text-align: ${lang === "ar" ? "right" : "left"}; }
.muted { color: #64748B; }
.tabular { font-variant-numeric: tabular-nums; }
.page-break { page-break-after: always; }
`;
}
