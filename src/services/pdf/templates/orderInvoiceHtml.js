import { esc, baseDocumentCss } from "../htmlUtils.js";

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
  order: "رقم الطلب",
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

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return "—";
  }
}

/** @param {unknown} json @param {PdfLang} lang */
function pickI18n(json, lang) {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const obj = /** @type {Record<string, unknown>} */ (json);
    const v = obj[lang];
    if (typeof v === "string" && v.trim()) return v.trim();
    const en = obj.en;
    if (typeof en === "string" && en.trim()) return en.trim();
    const ar = obj.ar;
    if (typeof ar === "string" && ar.trim()) return ar.trim();
  }
  return null;
}

/** @param {{ name?: string | null; nameI18n?: unknown; nameAr?: string | null }} entity @param {PdfLang} lang */
function entityName(entity, lang) {
  if (!entity) return "";
  const fromJson = pickI18n(entity.nameI18n, lang);
  if (fromJson) return fromJson;
  if (lang === "ar" && entity.nameAr) return String(entity.nameAr);
  return String(entity.name || "");
}

function lineDescription(row, lang) {
  const v = row.variant;
  if (!v) return `#${row.variantId}`;
  const p = entityName(v.product, lang);
  const t = entityName(v.type, lang);
  const s = entityName(v.size, lang);
  return [p, t, s].filter(Boolean).join(" · ");
}

function fmtMoney(n, currency) {
  const x = Number(n ?? 0);
  const cur = currency || "";
  return `${x.toFixed(2)} ${cur}`.trim();
}

/**
 * @param {object} order
 * @param {PdfLang} lang
 * @param {string | null} logoSrc
 */
export function buildOrderInvoiceHtml(order, lang, logoSrc) {
  const dict = lang === "ar" ? AR : EN;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const items = Array.isArray(order.items) ? order.items : [];
  const guestName = String(order.guest?.name || "—");
  const guestPhone = String(order.guest?.phone || "—");
  const driverName = String(order.driver?.name || "—");
  const notesRaw = pickI18n(order.dropoffNotesI18n, lang) || order.dropoffNotes || "";

  const styles = `
${baseDocumentCss(lang)}
.invoice { padding: 4px 0 0; }
.invoice-head {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 2px solid #4F46E5; padding-bottom: 14px; margin-bottom: 18px;
}
.invoice-head .brand { display: flex; align-items: center; gap: 12px; }
.invoice-head .brand img { width: 60px; height: 60px; object-fit: contain; }
.invoice-head h1 { font-size: 22px; color: #4F46E5; }
.invoice-head .meta { font-size: 10px; color: #475569; line-height: 1.7; text-align: ${dir === "rtl" ? "left" : "right"}; }
.invoice-head .meta strong { color: #0F172A; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.party {
  border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px;
  background: #F8FAFC;
}
.party h4 { font-size: 9px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.party .name { font-size: 12px; font-weight: 600; color: #0F172A; }
.party .sub { font-size: 10px; color: #475569; margin-top: 2px; }
.notes { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 10px 12px; margin-bottom: 18px; font-size: 10px; color: #78350F; }
.notes h4 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; color: #92400E; }
table.lines {
  border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden;
  font-size: 10px;
}
table.lines thead th {
  background: #312E81; color: #fff; font-weight: 600;
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 9px 10px;
}
table.lines tbody td { border-top: 1px solid #E2E8F0; padding: 8px 10px; }
table.lines tbody tr:nth-child(even) td { background: #F8FAFC; }
.totals {
  margin-top: 14px; margin-${dir === "rtl" ? "right" : "left"}: auto;
  width: 55%;
  border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;
}
.totals .row {
  display: flex; justify-content: space-between;
  padding: 9px 14px; font-size: 11px;
  border-top: 1px solid #E2E8F0;
}
.totals .row:first-child { border-top: 0; }
.totals .row.total {
  background: #4F46E5; color: #fff; font-weight: 700; font-size: 13px;
}
.numeric { font-variant-numeric: tabular-nums; white-space: nowrap; }
.footer { margin-top: 28px; text-align: center; color: #94A3B8; font-size: 9px; }
`;

  const logoImg = logoSrc ? `<img src="${esc(logoSrc)}" alt="logo"/>` : "";

  const linesHtml = items
    .map((it) => {
      const desc = lineDescription(it, lang);
      return `<tr>
        <td>${esc(desc)}</td>
        <td class="numeric">${esc(it.quantity ?? 0)}</td>
        <td class="numeric">${esc(fmtMoney(it.unitPrice, order.currency))}</td>
        <td class="numeric">${esc(fmtMoney(it.lineTotal, order.currency))}</td>
      </tr>`;
    })
    .join("");

  const notesHtml = notesRaw
    ? `<section class="notes">
        <h4>${esc(dict.dropoff)}</h4>
        <div>${esc(notesRaw)}</div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${esc(dict.title)} #${esc(order.id)}</title>
  <style>${styles}</style>
</head>
<body>
  <main class="invoice">
    <header class="invoice-head">
      <div class="brand">
        ${logoImg}
        <h1>${esc(dict.title)}</h1>
      </div>
      <div class="meta">
        <div><strong>${esc(dict.order)}:</strong> #${esc(order.id)}</div>
        <div><strong>${esc(dict.date)}:</strong> ${esc(fmtDate(order.createdAt))}</div>
        ${order.deliveredAt ? `<div><strong>${esc(dict.delivered)}:</strong> ${esc(fmtDate(order.deliveredAt))}</div>` : ""}
        <div><strong>${esc(dict.payment)}:</strong> ${esc(order.paymentMethod || "—")}</div>
      </div>
    </header>

    <section class="parties">
      <div class="party">
        <h4>${esc(dict.guest)}</h4>
        <div class="name">${esc(guestName)}</div>
        <div class="sub">${esc(dict.phone)}: ${esc(guestPhone)}</div>
      </div>
      <div class="party">
        <h4>${esc(dict.driver)}</h4>
        <div class="name">${esc(driverName)}</div>
      </div>
    </section>

    ${notesHtml}

    <section>
      <h3 style="font-size: 12px; margin-bottom: 8px;">${esc(dict.lines)}</h3>
      <table class="lines">
        <thead>
          <tr>
            <th>${esc(dict.colItem)}</th>
            <th>${esc(dict.colQty)}</th>
            <th>${esc(dict.colUnit)}</th>
            <th>${esc(dict.colLine)}</th>
          </tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>
    </section>

    <section class="totals">
      <div class="row">
        <div>${esc(dict.subtotal)}</div>
        <div class="numeric">${esc(fmtMoney(order.subtotal, order.currency))}</div>
      </div>
      <div class="row">
        <div>${esc(dict.commission)}</div>
        <div class="numeric">${esc(fmtMoney(order.commissionAmt, order.currency))}</div>
      </div>
      <div class="row total">
        <div>${esc(dict.total)}</div>
        <div class="numeric">${esc(fmtMoney(order.total, order.currency))}</div>
      </div>
    </section>

    <p class="footer">${esc(dict.footer)}</p>
  </main>
</body>
</html>`;
}
