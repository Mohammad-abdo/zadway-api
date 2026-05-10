import * as service from "./product-orders.service.js";
import { buildOrderInvoicePdfBuffer } from "../../services/pdf/orderInvoicePdf.js";
import { successResponse, paginatedResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";
import { resolvePdfLang } from "../../services/pdf/pdfLang.js";

export async function list(req, res) {
  try {
    const { items, total, page, limit } = await service.list(req.query);
    const pages = Math.max(1, Math.ceil(total / limit));
    return paginatedResponse(res, items, { page, limit, total, pages }, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function getById(req, res) {
  try {
    const row = await service.getById(req.params.id);
    if (!row) return errorResponse(res, t("db.not_found", req.locale), 404);
    return successResponse(res, row, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function create(req, res) {
  try {
    const row = await service.create(req.body);
    return successResponse(res, row, t("common.created", req.locale), 201);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function update(req, res) {
  try {
    const row = await service.update(req.params.id, req.body);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function remove(req, res) {
  try {
    await service.remove(req.params.id);
    return successResponse(res, null, t("common.deleted", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function patchStatus(req, res) {
  try {
    const row = await service.updateStatus(req.params.id, req.body.status);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function assignDriver(req, res) {
  try {
    const row = await service.assignDriver(req.params.id, req.body.driverId);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function acceptOffer(req, res) {
  try {
    const row = await service.acceptOffer(req.params.id, req.params.offerId);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function downloadInvoice(req, res) {
  try {
    const order = await service.getOrderForInvoice(req.params.id);
    if (!order) {
      return errorResponse(res, t("db.not_found", req.locale), 404);
    }
    if (order.status !== "DELIVERED") {
      return errorResponse(res, "Invoice is only available for delivered orders.", 400);
    }
    const lang = resolvePdfLang(req.query?.lang, req.headers["accept-language"]);
    const pdf = await buildOrderInvoicePdfBuffer(order, lang);
    const filename = `invoice-${order.id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdf);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}
