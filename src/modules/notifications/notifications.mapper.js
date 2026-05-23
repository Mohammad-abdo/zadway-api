/** Map admin/dashboard payloads to Prisma Notification shape (polymorphic). */

const PRISMA_KEYS = new Set([
  "type",
  "notifiableType",
  "notifiableId",
  "data",
  "isRead",
  "readAt",
]);

export function parseNotificationData(data) {
  if (data == null) return {};
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === "object" && parsed && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) return data;
  return {};
}

export function toPrismaNotificationData(body, { existing } = {}) {
  const b = body && typeof body === "object" ? body : {};
  const prevData = parseNotificationData(existing?.data);

  const data = { ...prevData };
  if (b.title !== undefined) data.title = b.title;
  if (b.body !== undefined) data.body = b.body;
  if (b.data !== undefined && typeof b.data === "object" && !Array.isArray(b.data)) {
    Object.assign(data, b.data);
  }

  const userId = b.userId ?? b.notifiableId ?? existing?.notifiableId;
  const out = {};

  if (b.type !== undefined || !existing) out.type = b.type ?? existing?.type ?? "general";
  if (userId !== undefined && userId !== null && String(userId).trim() !== "") {
    const nid = Number(userId);
    if (!Number.isFinite(nid) || nid < 1) {
      const e = new Error("userId must be a numeric user id (select a user from the list)");
      e.statusCode = 400;
      throw e;
    }
    out.notifiableType = b.notifiableType ?? existing?.notifiableType ?? "User";
    out.notifiableId = nid;
  } else if (b.notifiableType !== undefined) {
    out.notifiableType = b.notifiableType;
  } else if (b.notifiableId !== undefined) {
    out.notifiableId = Number(b.notifiableId);
  }

  if (!existing && (out.notifiableId == null || !out.notifiableType)) {
    const e = new Error("userId is required");
    e.statusCode = 400;
    throw e;
  }

  if (Object.keys(data).length > 0 || b.title !== undefined || b.body !== undefined) {
    out.data = data;
  }

  if (b.isRead !== undefined) {
    out.isRead = Boolean(b.isRead);
    out.readAt = b.isRead ? (b.readAt ?? new Date()) : null;
  } else if (b.readAt !== undefined) {
    out.readAt = b.readAt;
  }

  const prismaData = {};
  for (const key of PRISMA_KEYS) {
    if (out[key] !== undefined) prismaData[key] = out[key];
  }
  return prismaData;
}

/** Flatten DB row for admin list/detail/forms. */
export function toAdminNotification(row) {
  if (!row) return row;
  const data = parseNotificationData(row.data);
  const userId =
    row.userId != null
      ? row.userId
      : row.notifiableType === "User"
        ? row.notifiableId
        : null;

  return {
    ...row,
    userId,
    type: row.type ?? "general",
    title: data.title ?? data.message ?? null,
    body: data.body ?? null,
    message: data.message ?? data.body ?? null,
    isRead: row.isRead === true,
  };
}
