import * as service from "./driver-onboarding.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

function fail(res, req, e) {
  return errorResponse(res, e.message || t("common.error", req.locale), e.statusCode || 500);
}

export async function registerDriver(req, res) {
  try {
    const data = await service.registerDriver(req.body, req.files);
    return successResponse(res, data, t("auth.registered", req.locale), 201);
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function getOnboarding(req, res) {
  try {
    const data = await service.getOnboarding(req.user.id);
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function resubmitDocuments(req, res) {
  try {
    const data = await service.resubmitDocuments(req.user.id, req.files);
    return successResponse(res, data, t("common.updated", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function listForReview(req, res) {
  try {
    const data = await service.listDriversForReview(req.query);
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function pendingCount(req, res) {
  try {
    const data = await service.pendingCount();
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function getReview(req, res) {
  try {
    const data = await service.getDriverReview(req.params.id);
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function approve(req, res) {
  try {
    const data = await service.approveDriver(req.params.id);
    return successResponse(res, data, t("common.updated", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function reject(req, res) {
  try {
    const data = await service.rejectDriver(req.params.id, req.body);
    return successResponse(res, data, t("common.updated", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}

export async function reviewDocument(req, res) {
  try {
    const data = await service.reviewDocument(req.params.id, req.params.documentId, req.body);
    return successResponse(res, data, t("common.updated", req.locale));
  } catch (e) {
    return fail(res, req, e);
  }
}
