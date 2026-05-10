import prisma from "../../config/prisma.js";
import { verifyToken } from "../utils/jwtHelper.js";
import { getDashboardPermissionPayload } from "../utils/staffPermissions.js";
import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

export default async function authenticate(req, res, next) {
  const locale = req.locale ?? "en";
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return errorResponse(res, t("auth.unauthorized", locale), 401);
  }
  try {
    const decoded = verifyToken(token);
    const id = decoded?.id;
    if (!id) {
      return errorResponse(res, t("auth.invalid_token", locale), 401);
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        userType: true,
        status: true,
        name: true,
        displayName: true,
      },
    });
    if (!user) {
      return errorResponse(res, t("auth.user_not_found", locale), 401);
    }
    const permPayload = await getDashboardPermissionPayload(user.id, user.userType);
    req.user = {
      ...user,
      permissionNames: permPayload.permissionNames,
      isDashboardAdmin: permPayload.isDashboardAdmin,
    };
    next();
  } catch {
    return errorResponse(res, t("auth.invalid_token", locale), 401);
  }
}
