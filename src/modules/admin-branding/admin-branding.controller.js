import * as service from "./admin-branding.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function getPublic(req, res) {
  try {
    const data = await service.getPublicBranding();
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    // Table missing / client out of sync: keep login & shell working until `db push` + `generate`.
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /public/branding]", e?.message || e);
    }
    return successResponse(res, { logoUrl: null }, t("common.success", req.locale));
  }
}

export async function update(req, res) {
  const locale = req.locale ?? "en";
  try {
    const data = await service.upsertLogo(req.body || {});
    return successResponse(res, data, t("common.updated", locale));
  } catch (e) {
    if (e.message === "INVALID_LOGO_URL") {
      return errorResponse(res, t("validation.url_invalid", locale), 422);
    }
    return errorResponse(res, e.message, 500);
  }
}
