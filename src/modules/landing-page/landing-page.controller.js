import * as service from "./landing-page.service.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function getPublic(req, res) {
  try {
    const data = await service.getConfig();
    res.set("Cache-Control", "public, max-age=60");
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /public/landing]", e?.message || e);
    }
    return successResponse(res, {}, t("common.success", req.locale));
  }
}

export async function getAdmin(req, res) {
  try {
    const data = await service.getConfig();
    return successResponse(res, data, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function update(req, res) {
  const locale = req.locale ?? "en";
  try {
    const data = await service.saveConfig(req.body.config);
    return successResponse(res, data, t("common.updated", locale));
  } catch (e) {
    return errorResponse(res, e.message, e.statusCode || 500);
  }
}

export async function robots(req, res) {
  const config = await service.getConfig().catch(() => ({}));
  res.type("text/plain").set("Cache-Control", "public, max-age=3600");
  return res.send(service.buildRobots(config, req));
}

export async function sitemap(req, res) {
  const config = await service.getConfig().catch(() => ({}));
  res.type("application/xml").set("Cache-Control", "public, max-age=3600");
  return res.send(service.buildSitemap(config, req));
}
