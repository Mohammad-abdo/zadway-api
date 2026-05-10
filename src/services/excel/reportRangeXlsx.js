import ExcelJS from "exceljs";

const C = {
  primary: "FF4F46E5",
  primaryDark: "FF312E81",
  primarySoft: "FFEEF2FF",
  headerText: "FFFFFFFF",
  text: "FF0F172A",
  muted: "FF64748B",
  border: "FFCBD5E1",
  zebra: "FFF1F5F9",
  white: "FFFFFFFF",
  accent: "FF059669",
  titleRow: 52,
  sectionRow: 28,
};

/** @param {ExcelJS.Row} row */
function styleSectionBanner(row) {
  row.height = C.sectionRow;
  row.font = { bold: true, size: 12, color: { argb: C.headerText } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primaryDark } };
  row.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  row.eachCell((cell) => {
    cell.border = {
      bottom: { style: "medium", color: { argb: C.primary } },
    };
  });
}

/** @param {ExcelJS.Row} row */
function styleTableHeader(row) {
  row.height = 26;
  row.font = { bold: true, size: 11, color: { argb: C.headerText } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primary } };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: C.border } },
      left: { style: "thin", color: { argb: C.border } },
      bottom: { style: "thin", color: { argb: C.primaryDark } },
      right: { style: "thin", color: { argb: C.border } },
    };
  });
}

/** @param {ExcelJS.Row} row @param {number} dataRowIndex 0-based */
function styleDataRow(row, dataRowIndex) {
  row.height = 20;
  const fill =
    dataRowIndex % 2 === 1
      ? { type: "pattern", pattern: "solid", fgColor: { argb: C.zebra } }
      : undefined;
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: C.border } },
      left: { style: "thin", color: { argb: C.border } },
      bottom: { style: "thin", color: { argb: C.border } },
      right: { style: "thin", color: { argb: C.border } },
    };
    if (fill) cell.fill = fill;
    cell.font = { size: 11, color: { argb: C.text } };
  });
}

/** @param {ExcelJS.Worksheet} ws @param {number} startRow 1-based */
function freezeBelowHeader(ws, startRow) {
  ws.views = [{ state: "frozen", ySplit: startRow, activeCell: `A${startRow + 1}`, showGridLines: true }];
}

/** @param {Record<string, unknown>} payload */
export async function buildReportRangeXlsxBuffer(payload) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Qarora Admin";
  wb.created = new Date();
  wb.properties.date1904 = false;

  const overview = wb.addWorksheet("Overview", {
    properties: { tabColor: { argb: C.primary } },
  });
  overview.mergeCells(1, 1, 1, 8);
  const titleCell = overview.getCell(1, 1);
  titleCell.value = "Qarora — Admin report";
  titleCell.font = { bold: true, size: 22, color: { argb: C.headerText } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primaryDark } };
  overview.getRow(1).height = C.titleRow;

  overview.mergeCells(2, 1, 2, 8);
  const sub = overview.getCell(2, 1);
  sub.value = `Reporting period: ${payload.from}  →  ${payload.to}`;
  sub.font = { size: 12, color: { argb: C.muted }, italic: false };
  sub.alignment = { vertical: "middle", horizontal: "center" };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primarySoft } };
  overview.getRow(2).height = 32;

  overview.getCell(4, 1).value = "Generated (UTC)";
  overview.getCell(4, 1).font = { bold: true, size: 11, color: { argb: C.muted } };
  overview.getCell(4, 2).value = new Date().toISOString().slice(0, 19).replace("T", " ");
  overview.getCell(4, 2).font = { size: 11, color: { argb: C.text } };

  overview.getCell(5, 1).value = "Orders data";
  overview.getCell(5, 1).font = { bold: true, size: 11, color: { argb: C.muted } };
  overview.getCell(5, 2).value = payload.access?.orders ? "Included" : "Not available (permissions)";
  overview.getCell(5, 2).font = { size: 11, color: { argb: C.text } };

  overview.getCell(6, 1).value = "Shop / catalog data";
  overview.getCell(6, 1).font = { bold: true, size: 11, color: { argb: C.muted } };
  overview.getCell(6, 2).value = payload.access?.shop ? "Included" : "Not available (permissions)";
  overview.getCell(6, 2).font = { size: 11, color: { argb: C.text } };

  overview.getColumn(1).width = 28;
  overview.getColumn(2).width = 48;
  for (let c = 3; c <= 8; c += 1) overview.getColumn(c).width = 4;

  const o = payload.orders;
  if (o) {
    const ws = wb.addWorksheet("Orders", { properties: { tabColor: { argb: C.accent } } });

    ws.mergeCells(1, 1, 1, 6);
    const h1 = ws.getCell(1, 1);
    h1.value = "Orders & revenue";
    h1.font = { bold: true, size: 16, color: { argb: C.headerText } };
    h1.alignment = { vertical: "middle", horizontal: "center" };
    h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primaryDark } };
    ws.getRow(1).height = 40;

    ws.mergeCells(2, 1, 2, 6);
    ws.getCell(2, 1).value = `Period: ${payload.from}  →  ${payload.to}`;
    ws.getCell(2, 1).font = { size: 11, color: { argb: C.muted } };
    ws.getCell(2, 1).alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(2).height = 24;

    let r = 4;
    ws.getRow(r).values = ["Total orders", o.count];
    ws.getCell(r, 1).font = { bold: true, size: 11, color: { argb: C.muted } };
    ws.getCell(r, 2).font = { bold: true, size: 14, color: { argb: C.primaryDark } };
    ws.getRow(r).height = 24;
    r += 1;
    ws.getRow(r).values = ["Revenue (sum of order totals)", o.revenue];
    ws.getCell(r, 1).font = { bold: true, size: 11, color: { argb: C.muted } };
    ws.getCell(r, 2).font = { bold: true, size: 14, color: { argb: C.accent } };
    ws.getCell(r, 2).numFmt = "#,##0.00";
    ws.getRow(r).height = 24;
    r += 2;

    styleSectionBanner(ws.getRow(r));
    ws.getRow(r).getCell(1).value = "Breakdown by status";
    ws.mergeCells(r, 1, r, 6);
    r += 1;

    const statusHeaderRow = r;
    ws.getRow(r).values = ["Status", "Orders", "Revenue"];
    styleTableHeader(ws.getRow(r));
    r += 1;
    let idx = 0;
    for (const x of o.byStatus || []) {
      ws.getRow(r).values = [String(x.status), x.count, x.revenue];
      styleDataRow(ws.getRow(r), idx);
      ws.getCell(r, 2).numFmt = "#,##0";
      ws.getCell(r, 3).numFmt = "#,##0.00";
      r += 1;
      idx += 1;
    }
    r += 1;

    styleSectionBanner(ws.getRow(r));
    ws.getRow(r).getCell(1).value = "Daily trend";
    ws.mergeCells(r, 1, r, 6);
    r += 1;
    const dailyHeaderRow = r;
    ws.getRow(r).values = ["Date", "Orders", "Revenue"];
    styleTableHeader(ws.getRow(r));
    r += 1;
    idx = 0;
    for (const x of o.daily || []) {
      ws.getRow(r).values = [x.date, x.orders, x.revenue];
      styleDataRow(ws.getRow(r), idx);
      ws.getCell(r, 2).numFmt = "#,##0";
      ws.getCell(r, 3).numFmt = "#,##0.00";
      r += 1;
      idx += 1;
    }

    ws.getColumn(1).width = 22;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 16;
    ws.getColumn(4).width = 4;
    ws.getColumn(5).width = 4;
    ws.getColumn(6).width = 4;

    const freezeAt =
      Array.isArray(o.daily) && o.daily.length > 0 ? dailyHeaderRow : statusHeaderRow;
    freezeBelowHeader(ws, freezeAt);

    if (Array.isArray(o.productSales) && o.productSales.length) {
      const ps = wb.addWorksheet("Product sales", { properties: { tabColor: { argb: "FF7C3AED" } } });
      ps.mergeCells(1, 1, 1, 8);
      ps.getCell(1, 1).value = "Product sales (line items in period)";
      ps.getCell(1, 1).font = { bold: true, size: 15, color: { argb: C.headerText } };
      ps.getCell(1, 1).alignment = { vertical: "middle", horizontal: "center" };
      ps.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primaryDark } };
      ps.getRow(1).height = 36;
      ps.mergeCells(2, 1, 2, 8);
      ps.getCell(2, 1).value = `Period: ${payload.from}  →  ${payload.to}`;
      ps.getCell(2, 1).font = { size: 10, color: { argb: C.muted } };
      ps.getCell(2, 1).alignment = { horizontal: "center" };
      ps.getRow(2).height = 20;

      const hdr = 4;
      ps.getRow(hdr).values = ["Product ID", "Product name", "Variant ID", "SKU", "Size", "Type", "Qty", "Revenue"];
      styleTableHeader(ps.getRow(hdr));
      let pr = hdr + 1;
      let i = 0;
      for (const row of o.productSales) {
        ps.getRow(pr).values = [
          row.productId,
          row.productName,
          row.variantId,
          row.sku ?? "",
          row.sizeName ?? "",
          row.typeName ?? "",
          row.quantity,
          row.revenue,
        ];
        styleDataRow(ps.getRow(pr), i);
        ps.getCell(pr, 1).numFmt = "0";
        ps.getCell(pr, 3).numFmt = "0";
        ps.getCell(pr, 7).numFmt = "#,##0";
        ps.getCell(pr, 8).numFmt = "#,##0.00";
        pr += 1;
        i += 1;
      }
      ps.columns = [
        { width: 11 },
        { width: 32 },
        { width: 11 },
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 10 },
        { width: 14 },
      ];
      freezeBelowHeader(ps, hdr);
    }
  }

  const s = payload.shop;
  if (s?.counts) {
    const sc = wb.addWorksheet("Shop snapshot", { properties: { tabColor: { argb: "FFF59E0B" } } });
    sc.mergeCells(1, 1, 1, 4);
    sc.getCell(1, 1).value = "Shop catalog snapshot";
    sc.getCell(1, 1).font = { bold: true, size: 15, color: { argb: C.headerText } };
    sc.getCell(1, 1).alignment = { vertical: "middle", horizontal: "center" };
    sc.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primaryDark } };
    sc.getRow(1).height = 36;

    let rr = 3;
    sc.getRow(rr).values = ["Metric", "Count"];
    styleTableHeader(sc.getRow(rr));
    rr += 1;
    const rows = [
      ["Products", s.counts.products],
      ["Active products", s.counts.productsActive],
      ["Variants", s.counts.variants],
      ["Categories", s.counts.categories],
      ["Sizes", s.counts.sizes],
      ["Product types", s.counts.productTypes],
    ];
    let j = 0;
    for (const [a, b] of rows) {
      sc.getRow(rr).values = [a, b];
      styleDataRow(sc.getRow(rr), j);
      sc.getCell(rr, 2).numFmt = "#,##0";
      rr += 1;
      j += 1;
    }
    sc.getColumn(1).width = 26;
    sc.getColumn(2).width = 16;
  }

  if (s?.catalog?.length) {
    const cat = wb.addWorksheet("Catalog", { properties: { tabColor: { argb: "FF0EA5E9" } } });
    cat.mergeCells(1, 1, 1, 8);
    cat.getCell(1, 1).value = "Product catalog";
    cat.getCell(1, 1).font = { bold: true, size: 15, color: { argb: C.headerText } };
    cat.getCell(1, 1).alignment = { vertical: "middle", horizontal: "center" };
    cat.getCell(1, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.primaryDark } };
    cat.getRow(1).height = 36;
    cat.mergeCells(2, 1, 2, 8);
    cat.getCell(2, 1).value = "Latest products with primary variant (sample)";
    cat.getCell(2, 1).font = { size: 10, color: { argb: C.muted } };
    cat.getCell(2, 1).alignment = { horizontal: "center" };

    const hr = 4;
    cat.getRow(hr).values = ["ID", "Name", "Category", "Active", "SKU", "Price", "Stock", "Currency"];
    styleTableHeader(cat.getRow(hr));
    let cr = hr + 1;
    let k = 0;
    for (const row of s.catalog) {
      cat.getRow(cr).values = [
        row.id,
        row.name,
        row.categoryName ?? "",
        row.isActive ? "Yes" : "No",
        row.sku ?? "",
        row.price,
        row.stock,
        row.currency ?? "",
      ];
      styleDataRow(cat.getRow(cr), k);
      cat.getCell(cr, 1).numFmt = "0";
      cat.getCell(cr, 6).numFmt = "#,##0.00";
      cat.getCell(cr, 7).numFmt = "#,##0";
      cr += 1;
      k += 1;
    }
    cat.columns = [{ width: 8 }, { width: 34 }, { width: 22 }, { width: 10 }, { width: 18 }, { width: 12 }, { width: 10 }, { width: 10 }];
    freezeBelowHeader(cat, hr);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
