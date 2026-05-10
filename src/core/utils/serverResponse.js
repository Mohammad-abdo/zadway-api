import { detectLocale, t } from "../i18n/index.js";

export function successResponse(res, data, message, statusCode = 200) {
  const locale = detectLocale(res?.req);
  const finalMessage = message ?? t("common.success", locale);
  return res.status(statusCode).json({ success: true, message: finalMessage, data });
}

export function errorResponse(res, message, statusCode = 404) {
  const locale = detectLocale(res?.req);
  const finalMessage = message ?? t("common.error", locale);
  return res.status(statusCode).json({ success: false, message: finalMessage });
}

export function paginatedResponse(res, data, pagination, message) {
  const locale = detectLocale(res?.req);
  const finalMessage = message ?? t("common.success", locale);
  return res.status(200).json({ success: true, message: finalMessage, data, pagination });
}

