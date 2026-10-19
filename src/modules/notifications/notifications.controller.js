import * as service from "./notifications.service.js";
import { successResponse, paginatedResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";
import { userHasAnyPermission } from "../../core/utils/staffPermissions.js";

export async function list(req, res) {
  try {
    const { items, total, page, limit } = await service.list(req.query);
    const pages = Math.max(1, Math.ceil(total / limit));
    return paginatedResponse(res, items, { page, limit, total, pages }, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function stats(req, res) {
  try {
    const data = await service.stats(req.query);
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function adminMarkRead(req, res) {
  try {
    const result = await service.adminMarkRead(req.body || {});
    return successResponse(res, result, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function listMine(req, res) {
  try {
    const { items, total, page, limit } = await service.listMine(req.user.id, req.query);
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

async function canAccessNotification(req, row) {
  if (!row) return false;
  if (row.notifiableType === "User" && row.notifiableId === req.user.id) return true;
  // Fall back to real RBAC (role-granted permission), never the
  // self-reported/self-registerable `userType` field.
  return userHasAnyPermission(req.user.id, req.user.userType, ["notifications.manage"]);
}

export async function markRead(req, res) {
  try {
    const row = await service.getById(req.params.id);
    if (!row || !(await canAccessNotification(req, row))) {
      return errorResponse(res, t("db.not_found", req.locale), 404);
    }
    const updated = await service.markRead(req.params.id);
    return successResponse(res, updated, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function markAllRead(req, res) {
  try {
    const result = await service.markAllReadForUser(req.user.id);
    return successResponse(res, result, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}
