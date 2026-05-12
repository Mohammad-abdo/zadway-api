import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

/**
 * Requires authenticated user with `userType === "driver"`.
 */
export default function requireDriver(req, res, next) {
  const locale = req.locale ?? "en";
  if (!req.user) {
    return errorResponse(res, t("auth.unauthorized", locale), 401);
  }
  if (String(req.user.userType || "").toLowerCase() !== "driver") {
    return errorResponse(res, t("auth.forbidden", locale), 403);
  }
  next();
}
