import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("payment", { searchableFields: [] });

const PERSON = { select: { id: true, name: true, email: true, phone: true } };
const COLLECTED = ["paid", "success", "completed"];

const include = {
  user: PERSON,
  driver: PERSON,
  ProductOrder: {
    select: {
      id: true,
      status: true,
      subtotal: true,
      commissionPct: true,
      commissionAmt: true,
      total: true,
      currency: true,
      paymentMethod: true,
      createdAt: true,
      deliveredAt: true,
      guest: { select: { id: true, name: true, phone: true } },
      rider: PERSON,
      driver: PERSON,
      _count: { select: { items: true, payments: true } },
    },
  },
};

const SORTABLE = new Set(["id", "amount", "createdAt", "updatedAt", "paymentStatus", "paymentType", "ProductOrderId", "userId", "driverId"]);

function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDate(v, endOfDay = false) {
  if (!v || typeof v !== "string") return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function listOf(v) {
  if (v == null || v === "") return [];
  return (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter((s) => s && s !== "all");
}

function buildWhere(q) {
  const and = [];
  const statuses = listOf(q.status ?? q.paymentStatus);
  if (statuses.length) and.push({ paymentStatus: { in: statuses } });
  const methods = listOf(q.method ?? q.paymentType);
  if (methods.length) and.push({ paymentType: { in: methods } });
  const orderId = toInt(q.orderId ?? q.ProductOrderId);
  if (orderId) and.push({ ProductOrderId: orderId });
  const userId = toInt(q.userId);
  if (userId) and.push({ userId });
  const driverId = toInt(q.driverId);
  if (driverId) and.push({ driverId });
  const from = parseDate(q.from);
  const to = parseDate(q.to, true);
  if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
  const min = Number(q.minAmount);
  const max = Number(q.maxAmount);
  if (q.minAmount !== undefined && Number.isFinite(min)) and.push({ amount: { gte: min } });
  if (q.maxAmount !== undefined && Number.isFinite(max)) and.push({ amount: { lte: max } });

  const term = typeof q.q === "string" ? q.q.trim().replace(/^#/, "") : "";
  if (term) {
    const or = [
      { paymentType: { contains: term } },
      { paymentStatus: { contains: term } },
      { user: { is: { OR: [{ name: { contains: term } }, { email: { contains: term } }, { phone: { contains: term } }] } } },
      { driver: { is: { OR: [{ name: { contains: term } }, { phone: { contains: term } }] } } },
      { ProductOrder: { is: { guest: { is: { OR: [{ name: { contains: term } }, { phone: { contains: term } }] } } } } },
    ];
    const n = toInt(term);
    if (n) or.push({ id: n }, { ProductOrderId: n });
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const [field] = Object.keys(parsed.orderBy);
  const orderBy = SORTABLE.has(field) ? parsed.orderBy : { id: "desc" };
  const where = buildWhere(q);
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, skip: parsed.skip, take: parsed.take, orderBy, include }),
    prisma.payment.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.payment.findUnique({
    where: { id: Number(id) },
    include,
  });
}

const dayKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const sumOf = (agg) => Number(agg?._sum?.amount || 0);

export async function stats(q = {}) {
  const days = Math.min(90, Math.max(1, parseInt(String(q.days || "14"), 10) || 14));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const seriesStart = new Date(todayStart);
  seriesStart.setDate(seriesStart.getDate() - (days - 1));
  const collected = { paymentStatus: { in: COLLECTED } };

  const [all, byStatus, byMethod, collectedAll, today, todayCollected, month, monthCollected, recent] = await Promise.all([
    prisma.payment.aggregate({ _count: { _all: true }, _sum: { amount: true }, _avg: { amount: true } }),
    prisma.payment.groupBy({ by: ["paymentStatus"], _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.groupBy({ by: ["paymentType"], _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: collected, _count: { _all: true }, _sum: { amount: true }, _avg: { amount: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: todayStart } }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...collected, createdAt: { gte: todayStart } }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...collected, createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.findMany({ where: { createdAt: { gte: seriesStart } }, select: { amount: true, paymentStatus: true, createdAt: true } }),
  ]);

  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(seriesStart);
    d.setDate(d.getDate() + i);
    buckets.set(dayKey(d), { date: dayKey(d), count: 0, amount: 0, collected: 0 });
  }
  for (const p of recent) {
    const b = buckets.get(dayKey(new Date(p.createdAt)));
    if (!b) continue;
    const amt = Number(p.amount || 0);
    b.count += 1;
    b.amount += amt;
    if (COLLECTED.includes(String(p.paymentStatus).toLowerCase())) b.collected += amt;
  }
  const round = (v) => Math.round(v * 100) / 100;

  return {
    total: all._count._all,
    totalAmount: round(sumOf(all)),
    avgAmount: round(Number(all._avg.amount || 0)),
    collected: { count: collectedAll._count._all, amount: round(sumOf(collectedAll)), avg: round(Number(collectedAll._avg.amount || 0)) },
    today: { count: today._count._all, amount: round(sumOf(today)), collected: round(sumOf(todayCollected)) },
    month: { count: month._count._all, amount: round(sumOf(month)), collected: round(sumOf(monthCollected)) },
    byStatus: byStatus.map((s) => ({ status: s.paymentStatus, count: s._count._all, amount: round(sumOf(s)) })),
    byMethod: byMethod.map((m) => ({ method: m.paymentType, count: m._count._all, amount: round(sumOf(m)) })),
    daily: [...buckets.values()].map((b) => ({ ...b, amount: round(b.amount), collected: round(b.collected) })),
  };
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
