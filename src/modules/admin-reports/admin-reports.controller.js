import * as service from "./admin-reports.service.js";
import { buildReportRangePdfBuffer } from "../../services/pdf/reportRangePdf.js";
import { buildReportRangeXlsxBuffer } from "../../services/excel/reportRangeXlsx.js";
import { resolvePdfLang } from "../../services/pdf/pdfLang.js";
import { errorResponse, successResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function getRange(req, res) {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    if (!from || !to) {
      return errorResponse(res, "Query params `from` and `to` (YYYY-MM-DD) are required.", 400);
    }
    const names = req.user?.permissionNames || [];
    const data = await service.getReportsRange(names, from, to);
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function getRangePdf(req, res) {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    if (!from || !to) {
      return errorResponse(res, "Query params `from` and `to` (YYYY-MM-DD) are required.", 400);
    }
    const names = req.user?.permissionNames || [];
    const data = await service.getReportsRange(names, from, to);
    const lang = resolvePdfLang(req.query?.lang, req.headers["accept-language"]);
    const pdf = await buildReportRangePdfBuffer(data, lang);
    const filename = `orders-report-${from}_to_${to}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdf);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function getRangeXlsx(req, res) {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    if (!from || !to) {
      return errorResponse(res, "Query params `from` and `to` (YYYY-MM-DD) are required.", 400);
    }
    const names = req.user?.permissionNames || [];
    const data = await service.getReportsRange(names, from, to);
    const xlsx = await buildReportRangeXlsxBuffer(data);
    const filename = `admin-report-${from}_to_${to}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(xlsx);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}
