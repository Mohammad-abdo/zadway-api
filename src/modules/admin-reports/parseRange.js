/**
 * @param {string} ymd "YYYY-MM-DD"
 * @returns {Date} UTC start of that calendar day
 */
export function utcDayStart(ymd) {
  const parts = String(ymd).trim().split("-");
  if (parts.length !== 3) {
    const e = new Error("Invalid date format; use YYYY-MM-DD.");
    e.statusCode = 400;
    throw e;
  }
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const e = new Error("Invalid date values.");
    e.statusCode = 400;
    throw e;
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

/**
 * Inclusive end day -> exclusive upper bound for Prisma `lt`.
 * @param {string} ymd "YYYY-MM-DD"
 */
export function utcDayEndExclusive(ymd) {
  const start = utcDayStart(ymd);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

/**
 * @param {string} fromYmd
 * @param {string} toYmd
 * @param {{ maxDays?: number }} [opts]
 * @returns {{ from: Date; toExclusive: Date }}
 */
export function parseUtcRangeInclusive(fromYmd, toYmd, opts = {}) {
  const maxDays = opts.maxDays ?? 400;
  const from = utcDayStart(fromYmd);
  const toExclusive = utcDayEndExclusive(toYmd);
  if (from.getTime() >= toExclusive.getTime()) {
    const e = new Error("`from` must be before or equal to `to`.");
    e.statusCode = 400;
    throw e;
  }
  const spanMs = toExclusive.getTime() - from.getTime();
  const spanDays = spanMs / (86400 * 1000);
  if (spanDays > maxDays) {
    const e = new Error(`Date range too large (max ${maxDays} days).`);
    e.statusCode = 400;
    throw e;
  }
  return { from, toExclusive };
}
