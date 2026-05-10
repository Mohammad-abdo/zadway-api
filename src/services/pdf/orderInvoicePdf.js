import { getPublicBranding } from "../../modules/admin-branding/admin-branding.service.js";
import { renderHtmlToPdf } from "./htmlToPdf.js";
import { logoDataUri } from "./htmlUtils.js";
import { buildOrderInvoiceHtml } from "./templates/orderInvoiceHtml.js";

/** @typedef {"en" | "ar"} PdfLang */

/**
 * Render an order invoice as a PDF buffer using HTML → Chromium.
 *
 * @param {Awaited<ReturnType<import("../../modules/product-orders/product-orders.service.js").getOrderForInvoice>>} order
 * @param {PdfLang} lang
 * @returns {Promise<Buffer>}
 */
export async function buildOrderInvoicePdfBuffer(order, lang) {
  if (!order) {
    const e = new Error("missing order");
    e.statusCode = 400;
    throw e;
  }
  const branding = await getPublicBranding();
  const logoSrc = await logoDataUri(branding.logoUrl);
  const html = buildOrderInvoiceHtml(order, lang, logoSrc);
  return renderHtmlToPdf(html, {
    format: "A4",
    landscape: false,
    margin: { top: "14mm", right: "12mm", bottom: "16mm", left: "12mm" },
  });
}
