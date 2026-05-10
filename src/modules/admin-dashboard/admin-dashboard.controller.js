import * as service from "./admin-dashboard.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function getStats(req, res) {
  try {
    const names = req.user?.permissionNames || [];
    const data = await service.getDashboardStats(names);
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}
