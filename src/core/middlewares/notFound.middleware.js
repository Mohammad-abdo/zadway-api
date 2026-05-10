import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

export default function notFound(req, res) {
  const locale = req.locale ?? "en";
  return errorResponse(res, t("http.not_found", locale), 404);
}
