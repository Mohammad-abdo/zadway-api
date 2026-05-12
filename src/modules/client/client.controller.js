import * as service from "./client.service.js";
import { successResponse, paginatedResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function getCatalog(req, res) {
  try {
    const data = await service.getCatalog();
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function listVariants(req, res) {
  try {
    const rows = await service.listVariantsForProduct(req.params.productId);
    return successResponse(res, rows, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function createGuest(req, res) {
  try {
    const row = await service.findOrCreateGuest(req.body);
    return successResponse(res, row, t("common.created", req.locale), 201);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function createOrder(req, res) {
  try {
    const result = await service.createClientOrder(req.body, req.user || null);
    return successResponse(res, result, t("common.created", req.locale), 201);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function listMyOrders(req, res) {
  try {
    const { items, total, page, limit } = await service.listRiderOrders(req.user.id, req.query);
    const pages = Math.max(1, Math.ceil(total / limit));
    return paginatedResponse(res, items, { page, limit, total, pages }, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function getOrder(req, res) {
  try {
    const token = req.headers["x-order-access-token"] || req.headers["X-Order-Access-Token"];
    const row = await service.getClientOrder(req.params.id, {
      riderUserId: req.user?.id,
      accessTokenHeader: typeof token === "string" ? token : Array.isArray(token) ? token[0] : undefined,
    });
    return successResponse(res, row, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}
