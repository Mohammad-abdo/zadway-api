import * as service from "./products.service.js";
import { successResponse, paginatedResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function list(req, res) {
  try {
    const { items, total, page, limit } = await service.list(req.query);
    const pages = Math.max(1, Math.ceil(total / limit));
    return paginatedResponse(res, items, { page, limit, total, pages }, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}
export async function getProducts(req, res) {
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
export async function getProductById(req, res) {
  try {
    const row = await service.getById(req.params.id);
    if (!row) return errorResponse(res, t("db.not_found", req.locale), 404);
    return successResponse(res, row, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}
export async function getProductsByCategoryId(req, res) {
  try {
    const categoryId = Number(req.params.categoryId);

    const { items, total } = await service.getProductsByCategoryId(categoryId);

    return successResponse(res, { items, total }, "success");
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function create(req, res) {
  try {
    const row = await service.create(req.body);
    return successResponse(res, row, t("common.created", req.locale), 201);
  } catch (e) {
    const code = e.statusCode || 500;
    return errorResponse(res, e.message, code);
  }
}

export async function update(req, res) {
  try {
    const row = await service.update(req.params.id, req.body);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
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
