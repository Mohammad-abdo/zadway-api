import { detectLocale } from "../i18n/index.js";

export default function i18nMiddleware(req, res, next) {
  req.locale = detectLocale(req);
  next();
}
