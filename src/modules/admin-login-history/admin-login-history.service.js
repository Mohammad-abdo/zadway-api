import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const SEARCHABLE = ["ipAddress", "city", "country", "browser", "platform", "device", "org"];
const svc = createCrudService("adminLoginHistory", { searchableFields: SEARCHABLE });
const userSelect = { id: true, name: true, email: true, phone: true };

const has = (v) => v != null && String(v).trim() !== "";

function parseDate(v, endOfDay = false) {
  if (!has(v)) return null;
  const s = String(v).trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildWhere(q = {}, baseWhere = {}) {
  const where = { ...baseWhere };
  if (has(q.userId)) where.userId = Number(q.userId);
  if (has(q.ip)) where.ipAddress = String(q.ip).trim();
  if (has(q.ipAddress)) where.ipAddress = String(q.ipAddress).trim();
  if (has(q.country)) where.country = String(q.country).trim();
  if (has(q.browser)) where.browser = { contains: String(q.browser).trim() };
  if (has(q.platform)) where.platform = { contains: String(q.platform).trim() };
  const dt = has(q.deviceType) ? String(q.deviceType).toLowerCase() : "";
  if (dt === "mobile") where.isMobile = true;
  else if (dt === "tablet") where.isTablet = true;
  else if (dt === "desktop") where.isDesktop = true;
  const from = parseDate(q.from ?? q.dateFrom);
  const to = parseDate(q.to ?? q.dateTo, true);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  return where;
}

async function attachUsers(rows) {
  const ids = [...new Set(rows.map((r) => r.userId).filter((v) => v != null))];
  if (!ids.length) return rows.map((r) => ({ ...r, user: null }));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: userSelect });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null }));
}

export async function list(q = {}) {
  const parsed = parseListQuery(q, { searchableFields: SEARCHABLE, maxLimit: 500 });
  const where = buildWhere(q, parsed.where);
  const [items, total] = await Promise.all([
    prisma.adminLoginHistory.findMany({ where, skip: parsed.skip, take: parsed.take, orderBy: parsed.orderBy }),
    prisma.adminLoginHistory.count({ where }),
  ]);
  return { items: await attachUsers(items), total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  const row = await prisma.adminLoginHistory.findUnique({ where: { id: Number(id) } });
  if (!row) return null;
  const [withUser] = await attachUsers([row]);
  return withUser;
}

export async function stats(q = {}) {
  const days = Math.min(90, Math.max(1, parseInt(String(q.days || "14"), 10) || 14));
  const where = buildWhere({ ...q, from: undefined, to: undefined, dateFrom: undefined, dateTo: undefined });
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const since = new Date(startToday);
  since.setDate(since.getDate() - (days - 1));

  const [total, today, admins, ips, mobile, tablet, desktop, recent] = await Promise.all([
    prisma.adminLoginHistory.count({ where }),
    prisma.adminLoginHistory.count({ where: { ...where, createdAt: { gte: startToday } } }),
    prisma.adminLoginHistory.groupBy({ by: ["userId"], where: { ...where, userId: { not: null } }, _count: { _all: true } }),
    prisma.adminLoginHistory.groupBy({ by: ["ipAddress"], where: { ...where, ipAddress: { not: null } } }),
    prisma.adminLoginHistory.count({ where: { ...where, isMobile: true } }),
    prisma.adminLoginHistory.count({ where: { ...where, isTablet: true } }),
    prisma.adminLoginHistory.count({ where: { ...where, isDesktop: true } }),
    prisma.adminLoginHistory.findMany({ where: { ...where, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(key(d), 0);
  }
  for (const r of recent) {
    const k = key(new Date(r.createdAt));
    if (buckets.has(k)) buckets.set(k, buckets.get(k) + 1);
  }

  const topIds = admins
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 200)
    .map((a) => a.userId);
  const users = topIds.length ? await prisma.user.findMany({ where: { id: { in: topIds } }, select: userSelect }) : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  return {
    total,
    today,
    uniqueAdmins: admins.length,
    uniqueIps: ips.length,
    devices: { mobile, tablet, desktop },
    daily: [...buckets.entries()].map(([date, count]) => ({ date, count })),
    admins: admins
      .filter((a) => topIds.includes(a.userId))
      .map((a) => ({ ...(byId.get(a.userId) ?? { id: a.userId, name: null, email: null, phone: null }), count: a._count._all })),
  };
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
