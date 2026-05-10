import { getPublicBranding } from "../../modules/admin-branding/admin-branding.service.js";
import { renderHtmlToPdf } from "./htmlToPdf.js";
import { logoDataUri } from "./htmlUtils.js";
import { buildReportRangeHtml } from "./templates/reportRangeHtml.js";

/** @typedef {"en" | "ar"} PdfLang */

/**
 * Render the admin range report as a PDF buffer.
 *
 * Internally renders an HTML template with Chromium so Arabic shaping and
 * BIDI ordering are handled by the browser engine — no manual reshaping
 * required.
 *
 * @param {object} payload
 * @param {PdfLang} lang
 * @returns {Promise<Buffer>}
 */
export async function buildReportRangePdfBuffer(payload, lang) {
  const branding = await getPublicBranding();
  const logoSrc = await logoDataUri(branding.logoUrl);
  const html = buildReportRangeHtml(payload, lang, logoSrc);
  return renderHtmlToPdf(html, {
    format: "A4",
    landscape: true,
    margin: { top: "14mm", right: "10mm", bottom: "14mm", left: "10mm" },
  });
}
