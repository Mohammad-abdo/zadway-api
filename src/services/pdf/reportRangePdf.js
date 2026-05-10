import PDFDocument from "pdfkit";
import { getPublicBranding } from "../../modules/admin-branding/admin-branding.service.js";
import { FONT_PATHS } from "./pdfFontPaths.js";
import { loadLogoBuffer } from "./pdfLogo.js";
import { prepareArabicLine } from "./pdfRtl.js";

/** @typedef {"en" | "ar"} PdfLang */

const COL = {
  ink: "#0F172A",
  muted: "#64748B",
  line: "#E2E8F0",
  primary: "#4F46E5",
  primaryDark: "#312E81",
  onPrimary: "#FFFFFF",
  bandLight: "#EEF2FF",
  successBg: "#ECFDF5",
  successBorder: "#6EE7B7",
  successInk: "#065F46",
  rowZebra: "#F8FAFC",
};

const EN = {
  title: "Qarora — Admin report",
  period: "Reporting period",
  totalOrders: "Total orders",
  revenue: "Revenue (order totals)",
  byStatus: "Orders by status",
  status: "Status",
  count: "Orders",
  rev: "Revenue",
  productSales: "Product sales (in period)",
  product: "Product",
  qty: "Qty",
  shopTitle: "Shop catalog snapshot",
  products: "Products",
  activeProducts: "Active products",
  variants: "Variants",
  categories: "Categories",
  sizes: "Sizes",
  types: "Product types",
  catalogSample: "Catalog sample",
  sku: "SKU",
  price: "Price",
  stock: "Stock",
  footer: "Generated from Qarora admin",
  noOrders: "No access to order metrics for this export.",
  noData: "No data available for this export.",
  daily: "Daily trend",
  dateCol: "Date",
  category: "Category",
  metric: "Metric",
  valueLabel: "Value",
};

const AR = {
  title: "قرورا — تقرير إداري",
  period: "فترة التقرير",
  totalOrders: "إجمالي الطلبات",
  revenue: "الإيرادات (مجموع الطلبات)",
  byStatus: "الطلبات حسب الحالة",
  status: "الحالة",
  count: "الطلبات",
  rev: "الإيرادات",
  productSales: "مبيعات المنتجات (ضمن الفترة)",
  product: "المنتج",
  qty: "الكمية",
  shopTitle: "لقطة كتالوج المتجر",
  products: "المنتجات",
  activeProducts: "منتجات نشطة",
  variants: "المتغيرات",
  categories: "التصنيفات",
  sizes: "المقاسات",
  types: "أنواع المنتجات",
  catalogSample: "عينة من الكتالوج",
  sku: "SKU",
  price: "السعر",
  stock: "المخزون",
  footer: "صدر من لوحة إدارة قرورا",
  noOrders: "لا يوجد وصول لبيانات الطلبات في هذا التصدير.",
  noData: "لا توجد بيانات متاحة لهذا التصدير.",
  daily: "الاتجاه اليومي",
  dateCol: "اليوم",
  category: "التصنيف",
  metric: "المؤشر",
  valueLabel: "القيمة",
};

/**
 * @param {keyof typeof EN} key
 * @param {PdfLang} lang
 */
function t(key, lang) {
  const raw = lang === "ar" ? AR[key] : EN[key];
  if (typeof raw !== "string") return "";
  return lang === "ar" ? prepareArabicLine(raw) : raw;
}

function bumpY(doc, y, margin, pageH, need = 56) {
  if (y + need > pageH - margin - 36) {
    doc.addPage();
    return margin + 8;
  }
  return y;
}

/**
 * @param {PDFKit.PDFDocument} doc
 */
function drawFooter(doc, margin, contentW, pageH, lang) {
  doc.save();
  doc.fontSize(8).fillColor(COL.muted).font("Main");
  doc.text(t("footer", lang), margin, pageH - 32, { width: contentW, align: "center" });
  doc.restore();
}

/**
 * @param {PDFKit.PDFDocument} doc
 */
function drawHeaderBand(doc, margin, contentW, y, lang, title, periodLine, logoBuf) {
  const bandH = 92;
  doc.save();
  doc.fillColor(COL.primaryDark).roundedRect(margin, y, contentW, bandH, 10).fill();
  doc.fillColor("#C7D2FE").opacity(0.35).circle(margin + contentW - 40, y + 28, 70).fill();
  doc.opacity(1);

  if (logoBuf) {
    try {
      doc.save();
      doc.circle(margin + 46, y + 46, 30).clip();
      doc.image(logoBuf, margin + 16, y + 16, { width: 60, height: 60, fit: [60, 60] });
      doc.restore();
      doc.strokeColor("#FFFFFF").lineWidth(2).circle(margin + 46, y + 46, 30).stroke();
    } catch {
      /* ignore */
    }
  }

  const textLeft = margin + (logoBuf ? 100 : 20);
  const textW = contentW - (logoBuf ? 120 : 40);

  doc.fillColor(COL.onPrimary).font("Main").fontSize(20);
  if (lang === "ar") {
    doc.text(title, textLeft, y + 22, { width: textW, align: "right" });
    doc.fontSize(11).fillColor("#E0E7FF").text(periodLine, textLeft, y + 56, { width: textW, align: "right" });
  } else {
    doc.text(title, textLeft, y + 22, { width: textW, align: "left" });
    doc.fontSize(11).fillColor("#E0E7FF").text(periodLine, textLeft, y + 56, { width: textW, align: "left" });
  }
  doc.restore();
  return y + bandH + 20;
}

/**
 * @param {PDFKit.PDFDocument} doc
 */
function drawKpiPair(doc, margin, y, contentW, leftTitle, leftVal, rightTitle, rightVal, lang) {
  const gap = 14;
  const w = (contentW - gap) / 2;
  const h = 72;
  doc.save();
  doc.fillColor(COL.bandLight).roundedRect(margin, y, w, h, 12).fill();
  doc.strokeColor("#C7D2FE").lineWidth(1).roundedRect(margin, y, w, h, 12).stroke();
  doc.fillColor(COL.muted).fontSize(9).font("Main");
  if (lang === "ar") {
    doc.text(leftTitle, margin + 14, y + 14, { width: w - 28, align: "right" });
    doc.fillColor(COL.primaryDark).fontSize(22).text(String(leftVal), margin + 14, y + 34, { width: w - 28, align: "right" });
  } else {
    doc.text(leftTitle, margin + 14, y + 14, { width: w - 28 });
    doc.fillColor(COL.primaryDark).fontSize(22).text(String(leftVal), margin + 14, y + 34, { width: w - 28 });
  }

  const x2 = margin + w + gap;
  doc.fillColor(COL.successBg).roundedRect(x2, y, w, h, 12).fill();
  doc.strokeColor(COL.successBorder).lineWidth(1).roundedRect(x2, y, w, h, 12).stroke();
  doc.fillColor(COL.muted).fontSize(9);
  if (lang === "ar") {
    doc.text(rightTitle, x2 + 14, y + 14, { width: w - 28, align: "right" });
    doc.fillColor(COL.successInk).fontSize(22).text(String(rightVal), x2 + 14, y + 34, { width: w - 28, align: "right" });
  } else {
    doc.text(rightTitle, x2 + 14, y + 14, { width: w - 28 });
    doc.fillColor(COL.successInk).fontSize(22).text(String(rightVal), x2 + 14, y + 34, { width: w - 28 });
  }
  doc.restore();
  return y + h + 18;
}

/**
 * @param {PDFKit.PDFDocument} doc
 */
function drawSectionLabel(doc, margin, y, contentW, label, lang) {
  y = bumpY(doc, y, margin, doc.page.height, 40);
  doc.save();
  doc.fillColor(COL.primary).rect(margin, y + 4, 4, 18).fill();
  doc.fillColor(COL.ink).font("Main").fontSize(13);
  if (lang === "ar") {
    doc.text(label, margin + 12, y, { width: contentW - 16, align: "right" });
  } else {
    doc.text(label, margin + 12, y, { width: contentW - 16 });
  }
  doc.restore();
  return y + 30;
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {string[]} labels
 * @param {number[]} colW relative weights sum to contentW
 */
function drawTableHeaderRow(doc, margin, y, contentW, labels, colWeights, lang) {
  const sum = colWeights.reduce((a, b) => a + b, 0);
  const widths = colWeights.map((w) => (contentW * w) / sum);
  const rowH = 26;
  doc.save();
  doc.fillColor(COL.primary).roundedRect(margin, y, contentW, rowH, 4).fill();
  doc.fillColor(COL.onPrimary).fontSize(9).font("Main");
  let x = margin;
  for (let i = 0; i < labels.length; i += 1) {
    const lab = lang === "ar" ? prepareArabicLine(labels[i]) : labels[i];
    doc.text(lab, x + 8, y + 8, { width: widths[i] - 16, align: lang === "ar" ? "right" : "left" });
    x += widths[i];
  }
  doc.restore();
  return y + rowH;
}

/**
 * @param {PDFKit.PDFDocument} doc
 */
function drawTableDataRow(doc, margin, y, contentW, cells, colWeights, stripe, lang) {
  const sum = colWeights.reduce((a, b) => a + b, 0);
  const widths = colWeights.map((w) => (contentW * w) / sum);
  const rowH = 22;
  doc.save();
  if (stripe) {
    doc.fillColor(COL.rowZebra).roundedRect(margin, y, contentW, rowH, 2).fill();
  }
  doc.strokeColor(COL.line).lineWidth(0.5).roundedRect(margin, y, contentW, rowH, 2).stroke();
  doc.fillColor(COL.ink).fontSize(9).font("Main");
  let x = margin;
  for (let i = 0; i < cells.length; i += 1) {
    const raw = cells[i];
    const txt = typeof raw === "string" && lang === "ar" ? prepareArabicLine(raw) : String(raw);
    doc.text(txt, x + 8, y + 6, { width: widths[i] - 16, align: lang === "ar" ? "right" : "left" });
    x += widths[i];
  }
  doc.restore();
  return y + rowH;
}

/**
 * @param {object} payload
 * @param {PdfLang} lang
 */
export async function buildReportRangePdfBuffer(payload, lang) {
  const branding = await getPublicBranding();
  const logoBuf = await loadLogoBuffer(branding.logoUrl);
  const fontMain = lang === "ar" ? FONT_PATHS.arabic : FONT_PATHS.latin;

  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: "Qarora Admin report" } });
  /** @type {Buffer[]} */
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.registerFont("Main", fontMain);
  doc.font("Main");

  const margin = 40;
  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const contentW = pageW - margin * 2;
  let y = margin;

  const title = t("title", lang);
  const periodLine = `${t("period", lang)}: ${payload.from}  →  ${payload.to}`;
  y = drawHeaderBand(doc, margin, contentW, y, lang, title, periodLine, logoBuf);

  const o = payload.orders;
  const shop = payload.shop;

  if (o) {
    y = drawKpiPair(
      doc,
      margin,
      y,
      contentW,
      t("totalOrders", lang),
      o.count,
      t("revenue", lang),
      Number(o.revenue || 0).toFixed(2),
      lang,
    );

    y = drawSectionLabel(doc, margin, y, contentW, t("byStatus", lang), lang);
    const wStatus = [0.42, 0.22, 0.36];
    y = drawTableHeaderRow(doc, margin, y, contentW, [t("status", lang), t("count", lang), t("rev", lang)], wStatus, lang);
    let stripe = false;
    for (const row of o.byStatus || []) {
      y = bumpY(doc, y, margin, pageH, 28);
      y = drawTableDataRow(
        doc,
        margin,
        y,
        contentW,
        [String(row.status), String(row.count ?? ""), Number(row.revenue || 0).toFixed(2)],
        wStatus,
        stripe,
        lang,
      );
      stripe = !stripe;
    }
    y += 10;

    const daily = o.daily || [];
    if (daily.length) {
      y = drawSectionLabel(doc, margin, y, contentW, t("daily", lang), lang);
      const wDaily = [0.38, 0.22, 0.4];
      y = drawTableHeaderRow(doc, margin, y, contentW, [t("dateCol", lang), t("count", lang), t("rev", lang)], wDaily, lang);
      stripe = false;
      for (const row of daily) {
        y = bumpY(doc, y, margin, pageH, 28);
        y = drawTableDataRow(
          doc,
          margin,
          y,
          contentW,
          [String(row.date), String(row.orders), Number(row.revenue || 0).toFixed(2)],
          wDaily,
          stripe,
          lang,
        );
        stripe = !stripe;
      }
      y += 8;
    }

    const ps = o.productSales || [];
    if (ps.length) {
      y = drawSectionLabel(doc, margin, y, contentW, t("productSales", lang), lang);
      const wPs = [0.34, 0.18, 0.1, 0.1, 0.1, 0.18];
      y = drawTableHeaderRow(
        doc,
        margin,
        y,
        contentW,
        [t("product", lang), t("sku", lang), t("qty", lang), "Size", "Type", t("rev", lang)],
        wPs,
        lang,
      );
      stripe = false;
      const cap = 22;
      for (let i = 0; i < Math.min(ps.length, cap); i += 1) {
        const row = ps[i];
        y = bumpY(doc, y, margin, pageH, 28);
        const name = lang === "ar" ? prepareArabicLine(String(row.productName)) : String(row.productName);
        y = drawTableDataRow(
          doc,
          margin,
          y,
          contentW,
          [name, String(row.sku || "—"), String(row.quantity), String(row.sizeName || "—"), String(row.typeName || "—"), Number(row.revenue || 0).toFixed(2)],
          wPs,
          stripe,
          lang,
        );
        stripe = !stripe;
      }
      if (ps.length > cap) {
        y = bumpY(doc, y, margin, pageH, 20);
        doc.save().fillColor(COL.muted).fontSize(8).font("Main");
        const note =
          lang === "ar"
            ? prepareArabicLine(`+ ${ps.length - cap} صفوف إضافية — استخدم Excel للقائمة الكاملة.`)
            : `+ ${ps.length - cap} more rows — open the Excel export for the full list.`;
        doc.text(note, margin, y, { width: contentW, align: lang === "ar" ? "right" : "left" });
        doc.restore();
        y += 16;
      }
    }
  } else {
    y = bumpY(doc, y, margin, pageH, 36);
    doc.save().fillColor(COL.muted).fontSize(11).font("Main");
    const msg = lang === "ar" ? prepareArabicLine(t("noOrders", lang)) : t("noOrders", lang);
    doc.text(msg, margin, y, { width: contentW, align: lang === "ar" ? "right" : "left" });
    doc.restore();
    y += 28;
  }

  if (shop?.counts) {
    y = drawSectionLabel(doc, margin, y, contentW, t("shopTitle", lang), lang);
    const lines = [
      [t("products", lang), String(shop.counts.products)],
      [t("activeProducts", lang), String(shop.counts.productsActive)],
      [t("variants", lang), String(shop.counts.variants)],
      [t("categories", lang), String(shop.counts.categories)],
      [t("sizes", lang), String(shop.counts.sizes)],
      [t("types", lang), String(shop.counts.productTypes)],
    ];
    const wK = [0.55, 0.45];
    y = drawTableHeaderRow(doc, margin, y, contentW, [t("metric", lang), t("valueLabel", lang)], wK, lang);
    let stripe = false;
    for (const [a, b] of lines) {
      y = bumpY(doc, y, margin, pageH, 28);
      const left = lang === "ar" ? prepareArabicLine(a) : a;
      y = drawTableDataRow(doc, margin, y, contentW, [left, b], wK, stripe, lang);
      stripe = !stripe;
    }
    y += 10;

    const cat = shop.catalog || [];
    if (cat.length) {
      y = drawSectionLabel(doc, margin, y, contentW, t("catalogSample", lang), lang);
      const wCat = [0.08, 0.34, 0.22, 0.1, 0.14, 0.12];
      y = drawTableHeaderRow(
        doc,
        margin,
        y,
        contentW,
        ["#", t("product", lang), t("category", lang), t("sku", lang), t("price", lang), t("stock", lang)],
        wCat,
        lang,
      );
      stripe = false;
      const cap = 14;
      for (let i = 0; i < Math.min(cat.length, cap); i += 1) {
        const row = cat[i];
        y = bumpY(doc, y, margin, pageH, 28);
        const name = lang === "ar" ? prepareArabicLine(String(row.name)) : String(row.name);
        const catName = row.categoryName ? (lang === "ar" ? prepareArabicLine(String(row.categoryName)) : String(row.categoryName)) : "—";
        const priceStr =
          row.price != null ? `${Number(row.price).toFixed(2)} ${row.currency || ""}`.trim() : "—";
        y = drawTableDataRow(
          doc,
          margin,
          y,
          contentW,
          [String(row.id), name, catName, String(row.sku || "—"), priceStr, String(row.stock ?? "")],
          wCat,
          stripe,
          lang,
        );
        stripe = !stripe;
      }
    }
  }

  if (!o && !shop) {
    y = bumpY(doc, y, margin, pageH, 36);
    doc.save().fillColor(COL.muted).fontSize(11).font("Main");
    const msg = lang === "ar" ? prepareArabicLine(t("noData", lang)) : t("noData", lang);
    doc.text(msg, margin, y, { width: contentW, align: lang === "ar" ? "right" : "left" });
    doc.restore();
  }

  drawFooter(doc, margin, contentW, doc.page.height, lang);

  doc.end();
  await new Promise((resolve, reject) => {
    doc.on("end", resolve);
    doc.on("error", reject);
  });
  return Buffer.concat(chunks);
}
