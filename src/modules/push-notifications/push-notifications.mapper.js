/** Map admin `audience` field to Prisma forRider / forDriver flags. */

const PRISMA_KEYS = ["title", "titleI18n", "message", "messageI18n", "forRider", "forDriver"];

export function flagsToAudience(forRider, forDriver) {
  if (forRider && forDriver) return "all";
  if (forRider) return "rider";
  if (forDriver) return "driver";
  return "";
}

function audienceToFlags(audience) {
  const a = String(audience ?? "")
    .trim()
    .toLowerCase();
  if (!a) return null;
  if (a === "rider" || a === "riders") return { forRider: true, forDriver: false };
  if (a === "driver" || a === "drivers") return { forRider: false, forDriver: true };
  if (a === "all" || a === "both") return { forRider: true, forDriver: true };
  return null;
}

export function toPrismaPushNotificationData(body) {
  const b = body && typeof body === "object" ? body : {};
  const flags = audienceToFlags(b.audience);

  const mapped = {};
  if (b.title !== undefined) mapped.title = b.title;
  if (b.titleI18n !== undefined) mapped.titleI18n = b.titleI18n;
  if (b.message !== undefined) mapped.message = b.message;
  if (b.messageI18n !== undefined) mapped.messageI18n = b.messageI18n;

  if (flags) {
    mapped.forRider = flags.forRider;
    mapped.forDriver = flags.forDriver;
  } else {
    if (b.forRider !== undefined) mapped.forRider = Boolean(b.forRider);
    if (b.forDriver !== undefined) mapped.forDriver = Boolean(b.forDriver);
  }

  if (
    mapped.forRider === undefined &&
    mapped.forDriver === undefined &&
    (b.audience !== undefined || !body || Object.keys(b).length > 0)
  ) {
    const e = new Error("audience is required (rider, driver, or all)");
    e.statusCode = 400;
    throw e;
  }

  const data = {};
  for (const key of PRISMA_KEYS) {
    if (mapped[key] !== undefined) data[key] = mapped[key];
  }
  return data;
}

/** Flatten DB row for admin list/detail/forms. */
export function toAdminPushNotification(row) {
  if (!row) return row;
  const audience =
    row.audience != null && String(row.audience).trim() !== ""
      ? String(row.audience)
      : flagsToAudience(row.forRider, row.forDriver);

  return {
    ...row,
    audience,
    forRider: row.forRider === true,
    forDriver: row.forDriver === true,
  };
}
