import * as service from "./auth.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function login(req, res) {
  try {
    const result = await service.login(req.body);
    return successResponse(res, result, t("auth.logged_in", req.locale));
  } catch (e) {
    const code = e.statusCode || 401;
    return errorResponse(res, t("auth.invalid_credentials", req.locale), code);
  }
}

export async function register(req, res) {
  try {
    const result = await service.register(req.body);
    return successResponse(res, result, t("auth.registered", req.locale), 201);
  } catch (e) {
    const code = e.statusCode || 400;
    return errorResponse(res, e.message || t("common.error", req.locale), code);
  }
}

export async function me(req, res) {
  try {
    const user = await service.me(req.user.id);
    return successResponse(res, user, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function publicRegister(req, res) {
  try {
    const result = await service.publicRegister(req.body);
    return successResponse(res, result, t("auth.registered", req.locale), 201);
  } catch (e) {
    const code = e.statusCode || 400;
    return errorResponse(res, e.message || t("common.error", req.locale), code);
  }
}
