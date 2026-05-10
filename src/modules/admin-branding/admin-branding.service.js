import prisma from "../../config/prisma.js";
import { ADMIN_PANEL_LOGO_KEY } from "./admin-branding.constants.js";

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function normalizeLogoUrl(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s.slice(0, 2048);
  if (s.startsWith("/uploads/")) return s.slice(0, 2048);
  throw new Error("INVALID_LOGO_URL");
}

export async function getLogoRecord() {
  return prisma.adminSetting.findUnique({
    where: { key: ADMIN_PANEL_LOGO_KEY },
  });
}

export async function getPublicBranding() {
  const row = await getLogoRecord();
  return { logoUrl: row?.value ?? null };
}

/**
 * @param {{ logoUrl?: string | null }} payload
 */
export async function upsertLogo(payload) {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "logoUrl")) {
    return getPublicBranding();
  }
  const value = normalizeLogoUrl(payload.logoUrl);
  await prisma.adminSetting.upsert({
    where: { key: ADMIN_PANEL_LOGO_KEY },
    create: { key: ADMIN_PANEL_LOGO_KEY, value },
    update: { value },
  });
  return getPublicBranding();
}
