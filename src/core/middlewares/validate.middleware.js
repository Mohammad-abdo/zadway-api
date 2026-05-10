import { errorResponse } from "../utils/serverResponse.js";
import { t } from "../i18n/index.js";

/**
 * @param {import("zod").ZodType} schema - z.object({ body?, query?, params? })
 */
export function validate(schema) {
  return (req, res, next) => {
    const locale = req.locale ?? "en";
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      const msg = result.error?.issues?.map((i) => i.message).join("; ") || t("validation.failed", locale);
      return errorResponse(res, msg, 422);
    }
    const { body, query, params } = result.data;
    if (body !== undefined) req.body = body;
    if (query !== undefined) req.query = query;
    if (params !== undefined) req.params = params;
    next();
  };
}
