import prisma from "../../config/prisma.js";
import {
  DEFAULT_PLATFORM_COMMISSION_ENABLED,
  DEFAULT_PLATFORM_COMMISSION_PCT,
  PLATFORM_COMMISSION_ENABLED_KEY,
  PLATFORM_COMMISSION_PCT_KEY,
} from "./platform-settings.constants.js";

/**
 * Configured commission % (regardless of the on/off switch).
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
 * @returns {Promise<boolean>}
 */
export async function isPlatformCommissionEnabled() {
  const row = await prisma.adminSetting.findUnique({
    where: { key: PLATFORM_COMMISSION_ENABLED_KEY },
  });
  if (row?.value == null || row.value === "") return DEFAULT_PLATFORM_COMMISSION_ENABLED;
  return ["1", "true", "yes", "on"].includes(String(row.value).toLowerCase());
}

/**
 * Commission % actually applied to new orders: 0 while the system is disabled.
 * @returns {Promise<number>}
 */
export async function getEffectiveCommissionPct() {
  if (!(await isPlatformCommissionEnabled())) return 0;
  return getPlatformCommissionPct();
}

async function upsertSetting(key, value) {
  await prisma.adminSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/**
 * @param {{ enabled?: boolean; commissionPct?: number }} input
 */
export async function updateCommissionSettings({ enabled, commissionPct } = {}) {
  if (commissionPct !== undefined && commissionPct !== null) {
    const n = Number(commissionPct);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      const e = new Error("commissionPct must be between 0 and 100");
      e.statusCode = 400;
      throw e;
    }
    await upsertSetting(PLATFORM_COMMISSION_PCT_KEY, String(Number(n.toFixed(2))));
  }
  if (enabled !== undefined && enabled !== null) {
    await upsertSetting(PLATFORM_COMMISSION_ENABLED_KEY, enabled ? "true" : "false");
  }
  return getPlatformSettings();
}

/**
 * @returns {Promise<{ commissionEnabled: boolean; commissionPct: number; effectiveCommissionPct: number }>}
 */
export async function getPlatformSettings() {
  const [commissionEnabled, commissionPct] = await Promise.all([
    isPlatformCommissionEnabled(),
    getPlatformCommissionPct(),
  ]);
  return {
    commissionEnabled,
    commissionPct,
    effectiveCommissionPct: commissionEnabled ? commissionPct : 0,
  };
}
