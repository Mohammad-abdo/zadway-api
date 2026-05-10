import { esc, money, baseDocumentCss } from "../htmlUtils.js";

/** @typedef {"en" | "ar"} PdfLang */

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
  size: "Size",
  type: "Type",
  price: "Price",
  stock: "Stock",
  footer: "Generated from Qarora admin",
  noOrders: "No access to order metrics for this export.",
  noData: "No data available for this export.",
  daily: "Daily trend",
  date: "Date",
  category: "Category",
  metric: "Metric",
  value: "Value",
  active: "Active",
  yes: "Yes",
  no: "No",
  more: (n) => `+ ${n} more rows — open the Excel export for the full list.`,
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
  sku: "رمز SKU",
  size: "المقاس",
  type: "النوع",
  price: "السعر",
  stock: "المخزون",
  footer: "صدر من لوحة إدارة قرورا",
  noOrders: "لا يوجد وصول لبيانات الطلبات في هذا التصدير.",
  noData: "لا توجد بيانات متاحة لهذا التصدير.",
  daily: "الاتجاه اليومي",
  date: "اليوم",
  category: "التصنيف",
  metric: "المؤشر",
  value: "القيمة",
  active: "نشط",
  yes: "نعم",
  no: "لا",
  more: (n) => `+ ${n} صفوف إضافية — استخدم تصدير Excel للقائمة الكاملة.`,
};

/**
 * @param {object} payload
 * @param {PdfLang} lang
 * @param {string | null} logoSrc data: URI for the branding logo, if any
 */
export function buildReportRangeHtml(payload, lang, logoSrc) {
  const dict = lang === "ar" ? AR : EN;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const orders = payload?.orders;
  const shop = payload?.shop;
  const periodLine = `${dict.period}: ${esc(payload?.from ?? "")} → ${esc(payload?.to ?? "")}`;

  const styles = `
${baseDocumentCss(lang)}
.report { padding: 4px 0 0; }
.hero {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #312E81 0%, #4F46E5 100%);
  color: #fff;
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 18px;
  position: relative;
  overflow: hidden;
}
.hero::after {
  content: "";
  position: absolute;
  inset-block-start: -40px;
  inset-inline-end: -40px;
  width: 180px;
  height: 180px;
  background: rgba(199, 210, 254, 0.18);
  border-radius: 50%;
}
.hero .logo {
  width: 56px; height: 56px; border-radius: 50%;
  background: #fff; padding: 4px;
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
}
.hero .logo img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }
.hero h1 { font-size: 18px; }
.hero p { margin: 4px 0 0; opacity: 0.9; font-size: 11px; }
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
.kpi {
  border: 1px solid #C7D2FE;
  background: #EEF2FF;
  border-radius: 12px;
  padding: 14px 16px;
}
.kpi.success { background: #ECFDF5; border-color: #6EE7B7; }
.kpi h4 { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; margin: 0 0 4px; }
.kpi .v { font-size: 20px; font-weight: 700; color: #312E81; }
.kpi.success .v { color: #065F46; }
.section {
  margin-top: 18px;
  break-inside: avoid;
}
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 700; color: #0F172A;
  margin-bottom: 8px;
}
.section-title::before {
  content: ""; display: inline-block; width: 4px; height: 14px;
  background: #4F46E5; border-radius: 2px;
}
table.report-table { border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; font-size: 10px; }
table.report-table thead th {
  background: #4F46E5; color: #fff; font-weight: 600;
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 10px;
}
table.report-table tbody td { border-top: 1px solid #E2E8F0; }
table.report-table tbody tr:nth-child(even) td { background: #F8FAFC; }
.note { font-size: 9px; color: #64748B; margin-top: 6px; }
.empty { padding: 14px; border: 1px dashed #CBD5E1; border-radius: 10px; color: #64748B; font-size: 10px; text-align: center; }
.footer { margin-top: 24px; text-align: center; color: #94A3B8; font-size: 9px; }
.numeric { font-variant-numeric: tabular-nums; white-space: nowrap; }
.amount { color: #047857; font-weight: 600; }
`;

  const heroLogo = logoSrc ? `<div class="logo"><img src="${esc(logoSrc)}" alt="logo"/></div>` : "";

  const ordersBlock = orders ? renderOrdersBlock(orders, dict) : `<div class="empty">${esc(dict.noOrders)}</div>`;
  const shopBlock = shop?.counts ? renderShopBlock(shop, dict) : "";
  const emptyAll = !orders && !shop ? `<div class="empty">${esc(dict.noData)}</div>` : "";

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${esc(dict.title)}</title>
  <style>${styles}</style>
</head>
<body>
  <main class="report">
    <header class="hero">
      ${heroLogo}
      <div>
        <h1>${esc(dict.title)}</h1>
        <p>${periodLine}</p>
      </div>
    </header>
    ${ordersBlock}
    ${shopBlock}
    ${emptyAll}
    <p class="footer">${esc(dict.footer)}</p>
  </main>
</body>
</html>`;
}

/** @param {Record<string, unknown>} orders */
function renderOrdersBlock(orders, dict) {
  const byStatus = Array.isArray(orders.byStatus) ? orders.byStatus : [];
  const daily = Array.isArray(orders.daily) ? orders.daily : [];
  const productSales = Array.isArray(orders.productSales) ? orders.productSales : [];

  const kpis = `
    <section class="kpi-grid">
      <div class="kpi">
        <h4>${esc(dict.totalOrders)}</h4>
        <div class="v numeric">${esc(orders.count ?? 0)}</div>
      </div>
      <div class="kpi success">
        <h4>${esc(dict.revenue)}</h4>
        <div class="v numeric">${money(orders.revenue)}</div>
      </div>
    </section>`;

  const byStatusHtml = `
    <section class="section">
      <h3 class="section-title">${esc(dict.byStatus)}</h3>
      <table class="report-table">
        <thead><tr>
          <th>${esc(dict.status)}</th>
          <th>${esc(dict.count)}</th>
          <th>${esc(dict.rev)}</th>
        </tr></thead>
        <tbody>
          ${byStatus
            .map(
              (row) => `<tr>
            <td>${esc(row.status)}</td>
            <td class="numeric">${esc(row.count ?? 0)}</td>
            <td class="numeric amount">${money(row.revenue)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`;

  const dailyHtml = daily.length
    ? `<section class="section">
      <h3 class="section-title">${esc(dict.daily)}</h3>
      <table class="report-table">
        <thead><tr>
          <th>${esc(dict.date)}</th>
          <th>${esc(dict.count)}</th>
          <th>${esc(dict.rev)}</th>
        </tr></thead>
        <tbody>
          ${daily
            .map(
              (row) => `<tr>
            <td class="numeric">${esc(row.date)}</td>
            <td class="numeric">${esc(row.orders ?? 0)}</td>
            <td class="numeric amount">${money(row.revenue)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`
    : "";

  const cap = 60;
  const psHtml = productSales.length
    ? `<section class="section">
      <h3 class="section-title">${esc(dict.productSales)}</h3>
      <table class="report-table">
        <thead><tr>
          <th>${esc(dict.product)}</th>
          <th>${esc(dict.sku)}</th>
          <th>${esc(dict.size)}</th>
          <th>${esc(dict.type)}</th>
          <th>${esc(dict.qty)}</th>
          <th>${esc(dict.rev)}</th>
        </tr></thead>
        <tbody>
          ${productSales
            .slice(0, cap)
            .map(
              (row) => `<tr>
            <td>${esc(row.productName)}</td>
            <td class="numeric">${esc(row.sku || "—")}</td>
            <td>${esc(row.sizeName || "—")}</td>
            <td>${esc(row.typeName || "—")}</td>
            <td class="numeric">${esc(row.quantity ?? 0)}</td>
            <td class="numeric amount">${money(row.revenue)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      ${productSales.length > cap ? `<p class="note">${esc(dict.more(productSales.length - cap))}</p>` : ""}
    </section>`
    : "";

  return kpis + byStatusHtml + dailyHtml + psHtml;
}

/** @param {Record<string, unknown>} shop */
function renderShopBlock(shop, dict) {
  const counts = shop.counts || {};
  const catalog = Array.isArray(shop.catalog) ? shop.catalog : [];

  const summaryRows = [
    [dict.products, counts.products],
    [dict.activeProducts, counts.productsActive],
    [dict.variants, counts.variants],
    [dict.categories, counts.categories],
    [dict.sizes, counts.sizes],
    [dict.types, counts.productTypes],
  ];

  const summaryHtml = `
    <section class="section">
      <h3 class="section-title">${esc(dict.shopTitle)}</h3>
      <table class="report-table">
        <thead><tr>
          <th>${esc(dict.metric)}</th>
          <th>${esc(dict.value)}</th>
        </tr></thead>
        <tbody>
          ${summaryRows
            .map(
              ([k, v]) => `<tr>
            <td>${esc(k)}</td>
            <td class="numeric">${esc(v ?? 0)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`;

  const cap = 80;
  const catalogHtml = catalog.length
    ? `<section class="section">
      <h3 class="section-title">${esc(dict.catalogSample)}</h3>
      <table class="report-table">
        <thead><tr>
          <th>#</th>
          <th>${esc(dict.product)}</th>
          <th>${esc(dict.category)}</th>
          <th>${esc(dict.active)}</th>
          <th>${esc(dict.sku)}</th>
          <th>${esc(dict.price)}</th>
          <th>${esc(dict.stock)}</th>
        </tr></thead>
        <tbody>
          ${catalog
            .slice(0, cap)
            .map(
              (row) => `<tr>
            <td class="numeric">${esc(row.id)}</td>
            <td>${esc(row.name)}</td>
            <td>${esc(row.categoryName || "—")}</td>
            <td>${row.isActive ? esc(dict.yes) : esc(dict.no)}</td>
            <td class="numeric">${esc(row.sku || "—")}</td>
            <td class="numeric">${row.price != null ? `${money(row.price)} ${esc(row.currency || "")}` : "—"}</td>
            <td class="numeric">${esc(row.stock ?? 0)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
      ${catalog.length > cap ? `<p class="note">${esc(dict.more(catalog.length - cap))}</p>` : ""}
    </section>`
    : "";

  return summaryHtml + catalogHtml;
}
