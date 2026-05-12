import * as service from "./drivers-me.service.js";
import * as productOrdersService from "../product-orders/product-orders.service.js";
import { successResponse, errorResponse, paginatedResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function listInventory(req, res) {
  try {
    const rows = await service.listMyInventory(req.user.id);
    return successResponse(res, rows, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function createInventory(req, res) {
  try {
    const row = await service.createMyInventory(req.user.id, req.body);
    return successResponse(res, row, t("common.created", req.locale), 201);
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function updateInventory(req, res) {
  try {
    const row = await service.updateMyInventory(req.user.id, req.params.id, req.body);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function removeInventory(req, res) {
  try {
    await service.removeMyInventory(req.user.id, req.params.id);
    return successResponse(res, null, t("common.deleted", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function claimProductOrder(req, res) {
  try {
    const row = await productOrdersService.claimProductOrder(req.params.orderId, req.user.id);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function patchLocation(req, res) {
  try {
    const row = await service.updateMyLocation(req.user.id, req.body);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function listProductOrders(req, res) {
  try {
    const { items, total, page, limit } = await service.listMyProductOrders(req.user.id, req.query);
    const pages = Math.max(1, Math.ceil(total / limit));
    return paginatedResponse(res, items, { page, limit, total, pages }, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function getProductOrder(req, res) {
  try {
    const row = await service.getMyProductOrder(req.user.id, req.params.orderId);
    return successResponse(res, row, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function upsertOffer(req, res) {
  try {
    const row = await service.upsertMyOffer(req.user.id, req.params.orderId, req.body?.offeredPrice);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}
