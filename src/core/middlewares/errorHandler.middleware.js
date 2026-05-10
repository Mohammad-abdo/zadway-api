import { Prisma } from "@prisma/client";
import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

export default function errorHandler(err, req, res, _next) {
  const locale = req.locale ?? "en";
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return errorResponse(res, t("db.duplicate", locale), 409);
    }
    if (err.code === "P2025") {
      return errorResponse(res, t("db.not_found", locale), 404);
    }
    return errorResponse(res, t("db.error", locale), 400);
  }

  const status = err.statusCode || err.status || 500;
  const message = err.message || t("common.error", locale);
  return errorResponse(res, message, status);
}
