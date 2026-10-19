import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { toAdminNotification, toPrismaNotificationData } from "./notifications.mapper.js";

const svc = createCrudService("notification", { searchableFields: ["type"] });

const MAX_LIMIT = 500;
const SORTABLE = new Set(["id", "createdAt", "updatedAt", "readAt", "type", "isRead"]);
const USER_SELECT = { id: true, name: true, email: true, phone: true, countryCode: true, userType: true, avatar: true };

export const CATEGORY_KEYWORDS = {
  order: ["order", "booking", "cart", "delivery"],
  ride: ["ride", "trip"],
  payment: ["payment", "invoice", "refund", "coupon"],
  wallet: ["wallet", "withdraw", "transfer", "balance"],
  support: ["support", "ticket", "complaint", "chat", "sos"],
  driver: ["driver", "document", "onboarding", "vehicle"],
  promotion: ["promo", "offer", "marketing", "push"],
  security: ["security", "login", "otp", "password"],
};

export function categoryOf(type) {
  const s = String(type || "").toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => s.includes(w))) return cat;
  }
  return "system";
}

function toDate(v, endOfDay = false) {
  if (!v) return null;
  const s = String(v);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function buildWhere(q = {}) {
  const and = [];

  const userId = Number(q.userId ?? q.notifiableId);
  if (Number.isFinite(userId) && userId > 0) {
    and.push({ notifiableType: q.notifiableType || "User", notifiableId: userId });
  } else if (q.notifiableType) {
    and.push({ notifiableType: String(q.notifiableType) });
  }

  if (q.type) and.push({ type: String(q.type) });

  if (q.category) {
    const cat = String(q.category);
    if (cat === "system") {
      const all = Object.values(CATEGORY_KEYWORDS).flat();
      and.push({ NOT: { OR: all.map((w) => ({ type: { contains: w } })) } });
    } else if (CATEGORY_KEYWORDS[cat]) {
      and.push({ OR: CATEGORY_KEYWORDS[cat].map((w) => ({ type: { contains: w } })) });
    }
  }

  const read = String(q.read ?? q.status ?? "").toLowerCase();
  if (read === "read" || read === "true" || read === "1") and.push({ isRead: true });
  else if (read === "unread" || read === "false" || read === "0") and.push({ isRead: false });
  else if (q.isRead === "true" || q.isRead === true) and.push({ isRead: true });
  else if (q.isRead === "false" || q.isRead === false) and.push({ isRead: false });

  const from = toDate(q.from);
  const to = toDate(q.to, true);
  if (from || to) {
    and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
  }

  const search = typeof q.q === "string" ? q.q.trim() : "";
  if (search) {
    const or = [
      { type: { contains: search } },
      { data: { path: "$.title", string_contains: search } },
      { data: { path: "$.message", string_contains: search } },
      { data: { path: "$.body", string_contains: search } },
    ];
    if (/^\d+$/.test(search)) {
      or.push({ id: Number(search) });
      or.push({ notifiableId: Number(search) });
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { displayName: { contains: search } },
          ...(/^\d+$/.test(search) && search.length <= 15 ? [{ phone: Number(search) }] : []),
        ],
      },
      select: { id: true },
      take: 200,
    });
    if (users.length) or.push({ notifiableType: "User", notifiableId: { in: users.map((u) => u.id) } });
    and.push({ OR: or });
  }

  return and.length ? { AND: and } : {};
}

async function attachUsers(rows) {
  const ids = [...new Set(rows.filter((r) => r.notifiableType === "User").map((r) => r.notifiableId))];
  if (!ids.length) return rows.map((r) => ({ ...toAdminNotification(r), user: null }));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: USER_SELECT });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...toAdminNotification(r),
    user: r.notifiableType === "User" ? byId.get(r.notifiableId) || null : null,
  }));
}

export async function list(q = {}) {
  const page = Math.max(1, parseInt(String(q.page || "1"), 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(q.limit || "20"), 10) || 20));
  let orderBy = { id: "desc" };
  if (typeof q.sort === "string" && q.sort.includes(":")) {
    const [field, dir] = q.sort.split(":");
    if (SORTABLE.has(field)) orderBy = { [field]: dir?.toLowerCase() === "asc" ? "asc" : "desc" };
  }
  const where = await buildWhere(q);
  const [rows, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }),
  ]);
  return { items: await attachUsers(rows), total, page, limit };
}

export async function stats(q = {}) {
  const where = await buildWhere({ ...q, read: undefined, status: undefined, isRead: undefined });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [total, unread, today, groups, recipients] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { AND: [where, { isRead: false }] } }),
    prisma.notification.count({ where: { AND: [where, { createdAt: { gte: startOfToday } }] } }),
    prisma.notification.groupBy({ by: ["type"], where, _count: { _all: true } }),
    prisma.notification.groupBy({ by: ["notifiableType", "notifiableId"], where }),
  ]);
  const byType = groups
    .map((g) => ({ type: g.type, category: categoryOf(g.type), count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  const byCategory = {};
  for (const g of byType) byCategory[g.category] = (byCategory[g.category] || 0) + g.count;
  return {
    total,
    unread,
    read: total - unread,
    today,
    types: byType.length,
    recipients: recipients.length,
    byType,
    byCategory,
  };
}

/** Mobile: notifications for the authenticated user only. */
export async function listMine(userId, q = {}) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 30));
  const where = {
    notifiableType: "User",
    notifiableId: Number(userId),
  };
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items: rows.map(toAdminNotification), total, page, limit };
}

export async function getById(id) {
  const row = await svc.getById(id);
  if (!row) return row;
  const [withUser] = await attachUsers([row]);
  return withUser;
}

export async function create(data) {
  const prismaData = toPrismaNotificationData(data);
  const row = await prisma.notification.create({ data: prismaData });
  return toAdminNotification(row);
}

export async function update(id, data) {
  const existing = await prisma.notification.findUnique({ where: { id: Number(id) } });
  const prismaData = toPrismaNotificationData(data, { existing });
  const row = await prisma.notification.update({
    where: { id: Number(id) },
    data: prismaData,
  });
  return toAdminNotification(row);
}

export const remove = (id) => svc.remove(id);

export async function markRead(id) {
  const row = await prisma.notification.update({
    where: { id: Number(id) },
    data: { isRead: true, readAt: new Date() },
  });
  return toAdminNotification(row);
}

export async function markAllReadForUser(userId) {
  return prisma.notification.updateMany({
    where: {
      notifiableType: "User",
      notifiableId: Number(userId),
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });
}

/** Admin: bulk mark read/unread by ids, or every matching notification when no ids are given. */
export async function adminMarkRead({ ids, isRead = true, ...filters } = {}) {
  const read = isRead !== false;
  const where =
    Array.isArray(ids) && ids.length
      ? { id: { in: ids.map(Number).filter((n) => Number.isFinite(n) && n > 0) } }
      : await buildWhere({ ...filters, read: read ? "unread" : "read" });
  const result = await prisma.notification.updateMany({
    where,
    data: read ? { isRead: true, readAt: new Date() } : { isRead: false, readAt: null },
  });
  return { count: result.count };
}
