import PDFDocument from "pdfkit";
import { getPublicBranding } from "../../modules/admin-branding/admin-branding.service.js";
import { FONT_PATHS } from "./pdfFontPaths.js";
import { loadLogoBuffer } from "./pdfLogo.js";
import { prepareArabicLine } from "./pdfRtl.js";

/** @typedef {"en" | "ar"} PdfLang */

const EN = {
  title: "Invoice",
  order: "Order",
  date: "Date",
  delivered: "Delivered",
  guest: "Customer",
  phone: "Phone",
  driver: "Driver",
  payment: "Payment",
  dropoff: "Drop-off notes",
  lines: "Line items",
  colItem: "Item",
  colQty: "Qty",
  colUnit: "Unit",
  colLine: "Line total",
  subtotal: "Subtotal",
  commission: "Commission",
  total: "Total",
  footer: "Thank you for your order.",
};

const AR = {
  title: "فاتورة",
  order: "الطلب",
  date: "التاريخ",
  delivered: "التسليم",
  guest: "العميل",
  phone: "الهاتف",
  driver: "السائق",
  payment: "الدفع",
  dropoff: "ملاحظات التوصيل",
  lines: "البنود",
  colItem: "الصنف",
  colQty: "الكمية",
  colUnit: "السعر",
  colLine: "الإجمالي",
  subtotal: "المجموع الفرعي",
  commission: "العمولة",
  total: "الإجمالي",
  footer: "شكراً لطلبك.",
};

/**
 * @param {keyof typeof EN} key
 * @param {PdfLang} lang
 */
function label(key, lang) {
  const raw = lang === "ar" ? AR[key] : EN[key];
  if (typeof raw !== "string") return "";
  return lang === "ar" ? prepareArabicLine(raw) : raw;
}

/**
 * @param {unknown} json
 * @param {PdfLang} lang
 */
function pickI18n(json, lang) {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const v = /** @type {Record<string, unknown>} */ (json)[lang];
    if (typeof v === "string" && v.trim()) return v.trim();
    const en = /** @type {Record<string, unknown>} */ (json).en;
    if (typeof en === "string" && en.trim()) return en.trim();
    const ar = /** @type {Record<string, unknown>} */ (json).ar;
    if (typeof ar === "string" && ar.trim()) return ar.trim();
  }
  return null;
}

/**
 * @param {{ name?: string | null; nameI18n?: unknown; nameAr?: string | null }} entity
 * @param {PdfLang} lang
 */
function entityName(entity, lang) {
  if (!entity) return "";
  const fromJson = pickI18n(entity.nameI18n, lang);
  if (fromJson) return fromJson;
  if (lang === "ar" && entity.nameAr) return String(entity.nameAr);
  return String(entity.name || "");
}

/**
 * @param {import("@prisma/client").ProductOrderItem & { variant?: import("@prisma/client").ProductVariant & { product?: import("@prisma/client").Product; size?: import("@prisma/client").Size; type?: import("@prisma/client").ProductType }}} row
 * @param {PdfLang} lang
 */
function lineDescription(row, lang) {
  const v = row.variant;
  if (!v) return `#${row.variantId}`;
  const p = entityName(v.product, lang);
  const t = entityName(v.type, lang);
  const s = entityName(v.size, lang);
  const parts = [p, t, s].filter(Boolean);
  const text = parts.join(" · ");
  return lang === "ar" ? prepareArabicLine(text) : text;
}

function fmtMoney(n, currency) {
  const x = Number(n ?? 0);
  const cur = currency || "";
  return `${x.toFixed(2)} ${cur}`.trim();
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return "—";
  }
}

/**
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
  const logoBuf = await loadLogoBuffer(branding.logoUrl);

  const fontMain = lang === "ar" ? FONT_PATHS.arabic : FONT_PATHS.latin;

  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${order.id}` } });
  /** @type {Buffer[]} */
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  doc.registerFont("Main", fontMain);
  doc.font("Main");

  const pageW = doc.page.width;
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  if (logoBuf) {
    try {
      doc.image(logoBuf, margin, y, { width: 100, fit: [100, 44] });
    } catch {
      /* ignore bad image */
    }
  }

  doc.fontSize(20).fillColor("#111827");
  const title = label("title", lang);
  if (lang === "ar") {
    doc.text(title, margin, y, { width: contentW, align: "right" });
  } else {
    doc.text(title, margin + (logoBuf ? 110 : 0), y, { width: contentW - (logoBuf ? 110 : 0), align: "left" });
  }
  y += 52;

  doc.fontSize(10).fillColor("#374151");
  const metaLines = [
    `${label("order", lang)}: #${order.id}`,
    `${label("date", lang)}: ${fmtDate(order.createdAt)}`,
    order.deliveredAt ? `${label("delivered", lang)}: ${fmtDate(order.deliveredAt)}` : null,
    `${label("payment", lang)}: ${String(order.paymentMethod || "")}`,
  ].filter(Boolean);

  for (const line of metaLines) {
    if (lang === "ar") {
      doc.text(line, margin, y, { width: contentW, align: "right" });
    } else {
      doc.text(line, margin, y, { width: contentW, align: "left" });
    }
    y += 14;
  }
  y += 8;

  const guestName =
    lang === "ar"
      ? prepareArabicLine(String(order.guest?.name || "—"))
      : String(order.guest?.name || "—");
  const guestPhone = String(order.guest?.phone || "—");
  const driverName =
    lang === "ar"
      ? prepareArabicLine(String(order.driver?.name || "—"))
      : String(order.driver?.name || "—");

  doc.fillColor("#111827").fontSize(11);
  if (lang === "ar") {
    doc.text(`${label("guest", lang)}: ${guestName}`, margin, y, { width: contentW, align: "right" });
    y += 16;
    doc.text(`${label("phone", lang)}: ${guestPhone}`, margin, y, { width: contentW, align: "right" });
    y += 16;
    doc.text(`${label("driver", lang)}: ${driverName}`, margin, y, { width: contentW, align: "right" });
  } else {
    doc.text(`${label("guest", lang)}: ${guestName}`, margin, y);
    y += 16;
    doc.text(`${label("phone", lang)}: ${guestPhone}`, margin, y);
    y += 16;
    doc.text(`${label("driver", lang)}: ${driverName}`, margin, y);
  }
  y += 20;

  const notesRaw =
    lang === "ar"
      ? pickI18n(order.dropoffNotesI18n, "ar") || order.dropoffNotes || ""
      : pickI18n(order.dropoffNotesI18n, "en") || order.dropoffNotes || "";
  if (notesRaw) {
    doc.fontSize(10).fillColor("#4b5563");
    const noteLabel = label("dropoff", lang);
    const noteBody = lang === "ar" ? prepareArabicLine(String(notesRaw)) : String(notesRaw);
    if (lang === "ar") {
      doc.text(`${noteLabel}: ${noteBody}`, margin, y, { width: contentW, align: "right" });
    } else {
      doc.text(`${noteLabel}: ${noteBody}`, margin, y, { width: contentW });
    }
    y += 28;
  }

  doc.moveTo(margin, y).lineTo(pageW - margin, y).stroke("#e5e7eb");
  y += 12;

  doc.fontSize(12).fillColor("#111827");
  if (lang === "ar") {
    doc.text(label("lines", lang), margin, y, { width: contentW, align: "right" });
  } else {
    doc.text(label("lines", lang), margin, y);
  }
  y += 18;

  const colItemW = contentW * 0.46;
  const colQtyW = contentW * 0.12;
  const colUnitW = contentW * 0.2;
  const colLineW = contentW * 0.22;

  doc.fontSize(9).fillColor("#6b7280");
  if (lang === "ar") {
    const x0 = pageW - margin;
    doc.text(label("colLine", lang), x0 - colLineW, y, { width: colLineW, align: "right" });
    doc.text(label("colUnit", lang), x0 - colLineW - colUnitW, y, { width: colUnitW, align: "right" });
    doc.text(label("colQty", lang), x0 - colLineW - colUnitW - colQtyW, y, { width: colQtyW, align: "right" });
    doc.text(label("colItem", lang), margin, y, { width: colItemW, align: "right" });
  } else {
    doc.text(label("colItem", lang), margin, y, { width: colItemW, align: "left" });
    doc.text(label("colQty", lang), margin + colItemW, y, { width: colQtyW, align: "right" });
    doc.text(label("colUnit", lang), margin + colItemW + colQtyW, y, { width: colUnitW, align: "right" });
    doc.text(label("colLine", lang), margin + colItemW + colQtyW + colUnitW, y, { width: colLineW, align: "right" });
  }
  y += 14;
  doc.moveTo(margin, y).lineTo(pageW - margin, y).stroke("#e5e7eb");
  y += 8;

  doc.fontSize(10).fillColor("#111827");
  const items = Array.isArray(order.items) ? order.items : [];
  for (const it of items) {
    const desc = lineDescription(it, lang);
    const qty = String(it.quantity ?? "");
    const unit = fmtMoney(it.unitPrice, order.currency);
    const lineTot = fmtMoney(it.lineTotal, order.currency);

    if (lang === "ar") {
      const x0 = pageW - margin;
      doc.text(lineTot, x0 - colLineW, y, { width: colLineW, align: "right" });
      doc.text(unit, x0 - colLineW - colUnitW, y, { width: colUnitW, align: "right" });
      doc.text(qty, x0 - colLineW - colUnitW - colQtyW, y, { width: colQtyW, align: "right" });
      doc.text(desc, margin, y, { width: colItemW, align: "right" });
    } else {
      doc.text(desc, margin, y, { width: colItemW, align: "left" });
      doc.text(qty, margin + colItemW, y, { width: colQtyW, align: "right" });
      doc.text(unit, margin + colItemW + colQtyW, y, { width: colUnitW, align: "right" });
      doc.text(lineTot, margin + colItemW + colQtyW + colUnitW, y, { width: colLineW, align: "right" });
    }
    y += Math.max(36, doc.heightOfString(desc, { width: colItemW }) + 6);
    if (y > doc.page.height - 140) {
      doc.addPage();
      doc.font("Main");
      y = margin;
    }
  }

  y += 10;
  doc.moveTo(margin, y).lineTo(pageW - margin, y).stroke("#e5e7eb");
  y += 14;

  doc.fontSize(11).fillColor("#111827");
  const rows = [
    [label("subtotal", lang), fmtMoney(order.subtotal, order.currency)],
    [label("commission", lang), fmtMoney(order.commissionAmt, order.currency)],
    [label("total", lang), fmtMoney(order.total, order.currency)],
  ];
  for (const [lab, val] of rows) {
    if (lang === "ar") {
      doc.text(val, margin, y, { width: contentW, align: "left" });
      doc.text(lab, margin, y, { width: contentW, align: "right" });
    } else {
      doc.text(lab, margin, y, { width: contentW * 0.65, align: "left" });
      doc.text(val, margin + contentW * 0.65, y, { width: contentW * 0.35, align: "right" });
    }
    y += 18;
  }

  y = doc.page.height - 64;
  doc.fontSize(9).fillColor("#9ca3af");
  const foot = label("footer", lang);
  if (lang === "ar") {
    doc.text(foot, margin, y, { width: contentW, align: "center" });
  } else {
    doc.text(foot, margin, y, { width: contentW, align: "center" });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });

  return Buffer.concat(chunks);
}
