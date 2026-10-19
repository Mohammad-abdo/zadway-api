import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

function isDriver(req) {
  return String(req.user?.userType || "").toLowerCase() === "driver";
}

/**
 * Requires authenticated user with `userType === "driver"` (any review status).
 * Use for onboarding endpoints that pending / rejected captains still need.
 */
export function requireDriverAccount(req, res, next) {
  const locale = req.locale ?? "en";
  if (!req.user) {
    return errorResponse(res, t("auth.unauthorized", locale), 401);
  }
  if (!isDriver(req)) {
    return errorResponse(res, t("auth.forbidden", locale), 403);
  }
  next();
}

/**
 * Requires an approved (`status === "active"`) driver.
 * Pending / rejected captains get 403 with `code: "driver_not_approved"`.
 */
export default function requireDriver(req, res, next) {
  const locale = req.locale ?? "en";
  if (!req.user) {
    return errorResponse(res, t("auth.unauthorized", locale), 401);
  }
  if (!isDriver(req)) {
    return errorResponse(res, t("auth.forbidden", locale), 403);
  }
  const status = String(req.user.status || "").toLowerCase();
  if (status !== "active") {
    return res.status(403).json({
      success: false,
      code: "driver_not_approved",
      status,
      message:
        locale === "ar"
          ? "حسابك قيد المراجعة من الإدارة"
          : "Your captain account is awaiting admin approval",
    });
  }
  next();
}
