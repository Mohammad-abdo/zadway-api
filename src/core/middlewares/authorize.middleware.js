import { userHasAnyPermission } from "../utils/staffPermissions.js";
import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

/**
 * @param {string[]} permissionNames - user must have at least one (wildcard `*` on role also passes).
 */
export function requirePermission(permissionNames) {
  return async (req, res, next) => {
    const locale = req.locale ?? "en";
    const user = req.user;
    if (!user) {
      return errorResponse(res, t("auth.unauthorized", locale), 401);
    }
    const ok = await userHasAnyPermission(user.id, user.userType, permissionNames);
    if (!ok) {
      return errorResponse(res, t("auth.forbidden", locale), 403);
    }
    next();
  };
}

/**
 * Read/list/detail: allow either `*.view` or `*.manage` for the same resource
 * (pass the existing `*.manage` constant, e.g. `"users.manage"`).
 */
export function requireResourceAccess(managePermName) {
  if (typeof managePermName !== "string" || !managePermName.endsWith(".manage")) {
    return requirePermission([managePermName]);
  }
  const view = managePermName.replace(/\.manage$/, ".view");
  return requirePermission([view, managePermName]);
}
