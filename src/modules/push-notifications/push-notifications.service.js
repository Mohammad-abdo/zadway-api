import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";
import { toAdminPushNotification, toPrismaPushNotificationData } from "./push-notifications.mapper.js";

const svc = createCrudService("pushNotification", { searchableFields: [] });

const SORTABLE = new Set(["id", "title", "createdAt", "updatedAt", "forRider", "forDriver"]);

const AUDIENCE_WHERE = {
  rider: { forRider: true, forDriver: false },
  riders: { forRider: true, forDriver: false },
  driver: { forRider: false, forDriver: true },
  drivers: { forRider: false, forDriver: true },
  all: { forRider: true, forDriver: true },
  both: { forRider: true, forDriver: true },
};

function parseDate(v, endOfDay = false) {
  if (!v) return null;
  const s = String(v).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildWhere(q = {}) {
  const and = [];
  const audience = String(q.audience ?? q.target ?? "").trim().toLowerCase();
  if (AUDIENCE_WHERE[audience]) and.push(AUDIENCE_WHERE[audience]);

  const from = parseDate(q.from);
  const to = parseDate(q.to, true);
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });

  const term = typeof q.q === "string" ? q.q.trim().replace(/^#/, "") : "";
  if (term) {
    const or = [{ title: { contains: term } }, { message: { contains: term } }];
    const n = Number.parseInt(term, 10);
    if (Number.isInteger(n) && n > 0 && String(n) === term) or.push({ id: n });
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

export async function list(q = {}) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const [field] = Object.keys(parsed.orderBy);
  const orderBy = SORTABLE.has(field) ? parsed.orderBy : { id: "desc" };
  const where = buildWhere(q);
  const [items, total] = await Promise.all([
    prisma.pushNotification.findMany({ where, skip: parsed.skip, take: parsed.take, orderBy }),
    prisma.pushNotification.count({ where }),
  ]);
  return { items: items.map(toAdminPushNotification), total, page: parsed.page, limit: parsed.limit };
}

const dayKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export async function stats(q = {}) {
  const days = Math.min(90, Math.max(1, parseInt(String(q.days || "14"), 10) || 14));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const seriesStart = new Date(todayStart);
  seriesStart.setDate(seriesStart.getDate() - (days - 1));

  const [total, month, today, rider, driver, all, recent, riders, drivers] = await Promise.all([
    prisma.pushNotification.count(),
    prisma.pushNotification.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.pushNotification.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.pushNotification.count({ where: AUDIENCE_WHERE.rider }),
    prisma.pushNotification.count({ where: AUDIENCE_WHERE.driver }),
    prisma.pushNotification.count({ where: AUDIENCE_WHERE.all }),
    prisma.pushNotification.findMany({ where: { createdAt: { gte: seriesStart } }, select: { forRider: true, forDriver: true, createdAt: true } }),
    prisma.user.count({ where: { userType: "rider" } }).catch(() => 0),
    prisma.user.count({ where: { userType: "driver" } }).catch(() => 0),
  ]);

  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(seriesStart);
    d.setDate(d.getDate() + i);
    buckets.set(dayKey(d), { date: dayKey(d), count: 0, rider: 0, driver: 0, all: 0 });
  }
  for (const p of recent) {
    const b = buckets.get(dayKey(new Date(p.createdAt)));
    if (!b) continue;
    b.count += 1;
    if (p.forRider && p.forDriver) b.all += 1;
    else if (p.forRider) b.rider += 1;
    else if (p.forDriver) b.driver += 1;
  }

  return {
    total,
    month,
    today,
    byAudience: [
      { audience: "rider", count: rider },
      { audience: "driver", count: driver },
      { audience: "all", count: all },
    ],
    reach: { rider: riders, driver: drivers, all: riders + drivers },
    daily: [...buckets.values()],
  };
}

export async function getById(id) {
  const row = await svc.getById(id);
  return toAdminPushNotification(row);
}

export async function create(data) {
  const prismaData = toPrismaPushNotificationData(data);
  const row = await prisma.pushNotification.create({ data: prismaData });
  return toAdminPushNotification(row);
}

export async function update(id, data) {
  const prismaData = toPrismaPushNotificationData(data);
  const row = await prisma.pushNotification.update({
    where: { id: Number(id) },
    data: prismaData,
  });
  return toAdminPushNotification(row);
}

export const remove = (id) => svc.remove(id);
