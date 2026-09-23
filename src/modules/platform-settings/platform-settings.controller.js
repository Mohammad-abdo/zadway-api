import * as service from "./platform-settings.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function getSettings(req, res) {
  try {
    const data = await service.getPlatformSettings();
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function updateCommission(req, res) {
  try {
    const data = await service.setPlatformCommissionPct(req.body?.commissionPct);
    return successResponse(res, data, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}
