import prisma from "../../config/prisma.js";
import {
  DEFAULT_PLATFORM_COMMISSION_PCT,
  PLATFORM_COMMISSION_PCT_KEY,
} from "./platform-settings.constants.js";

/**
 * @returns {Promise<number>}
 */
export async function getPlatformCommissionPct() {
  const row = await prisma.adminSetting.findUnique({
    where: { key: PLATFORM_COMMISSION_PCT_KEY },
  });
  if (!row?.value) return DEFAULT_PLATFORM_COMMISSION_PCT;
  const n = Number(row.value);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PLATFORM_COMMISSION_PCT;
  return Math.min(100, n);
}

/**
 * @param {number} pct
 * @returns {Promise<{ commissionPct: number }>}
 */
export async function setPlatformCommissionPct(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    const e = new Error("commissionPct must be between 0 and 100");
    e.statusCode = 400;
    throw e;
  }
  const value = String(Number(n.toFixed(2)));
  await prisma.adminSetting.upsert({
    where: { key: PLATFORM_COMMISSION_PCT_KEY },
    create: { key: PLATFORM_COMMISSION_PCT_KEY, value },
    update: { value },
  });
  return { commissionPct: Number(value) };
}

/**
 * @returns {Promise<{ commissionPct: number }>}
 */
export async function getPlatformSettings() {
  return { commissionPct: await getPlatformCommissionPct() };
}
