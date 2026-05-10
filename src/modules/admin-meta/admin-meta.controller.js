import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";
import { getAdminMeta } from "./admin-meta.service.js";

export async function getMeta(req, res) {
  try {
    const payload = getAdminMeta();
    return successResponse(res, payload, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

