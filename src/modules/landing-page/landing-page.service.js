import prisma from "../../config/prisma.js";

export const LANDING_CONFIG_KEY = "landing_page_config";
export const LANDING_CONFIG_MAX_BYTES = 512 * 1024;

export async function getConfig() {
  const row = await prisma.adminSetting.findUnique({ where: { key: LANDING_CONFIG_KEY } });
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveConfig(config) {
  const value = JSON.stringify(config ?? {});
  if (Buffer.byteLength(value, "utf8") > LANDING_CONFIG_MAX_BYTES) {
    const err = new Error("Landing config is too large");
    err.statusCode = 413;
    throw err;
  }
  await prisma.adminSetting.upsert({
    where: { key: LANDING_CONFIG_KEY },
    create: { key: LANDING_CONFIG_KEY, value },
    update: { value },
  });
  return JSON.parse(value);
}

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

function siteUrlOf(config, req) {
  const configured = typeof config?.seo?.siteUrl === "string" ? config.seo.siteUrl.trim() : "";
  if (configured) return configured.replace(/\/+$/, "");
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`;
}

export function buildRobots(config, req) {
  const base = siteUrlOf(config, req);
  const allow = config?.seo?.robotsIndex !== false;
  const lines = ["User-agent: *", allow ? "Allow: /" : "Disallow: /"];
  if (allow) {
    lines.push("Disallow: /login", "Disallow: /api/");
    lines.push("", `Sitemap: ${base}/sitemap.xml`);
  }
  return `${lines.join("\n")}\n`;
}

export function buildSitemap(config, req) {
  const base = siteUrlOf(config, req);
  const extra = Array.isArray(config?.seo?.sitemapPaths) ? config.seo.sitemapPaths : [];
  const paths = ["/", ...extra.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim())];
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [...new Set(paths)]
    .map((p) => {
      const loc = /^https?:\/\//i.test(p) ? p : `${base}${p.startsWith("/") ? p : `/${p}`}`;
      return `  <url><loc>${xmlEscape(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
