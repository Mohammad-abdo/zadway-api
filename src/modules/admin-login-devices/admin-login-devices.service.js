import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const SEARCHABLE = ["ipAddress", "userAgent", "sessionId"];
const svc = createCrudService("adminLoginDevice", { searchableFields: SEARCHABLE });

const include = {
  user: { select: { id: true, name: true, email: true, phone: true } },
};

const has = (v) => v != null && String(v).trim() !== "";

function parseDate(v, endOfDay = false) {
  if (!has(v)) return null;
  const s = String(v).trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function list(q = {}) {
  const parsed = parseListQuery(q, { searchableFields: SEARCHABLE, maxLimit: 500 });
  const where = { ...parsed.where };
  if (has(q.userId)) where.userId = Number(q.userId);
  if (has(q.ip)) where.ipAddress = String(q.ip).trim();
  if (has(q.ipAddress)) where.ipAddress = String(q.ipAddress).trim();
  if (has(q.sessionId)) where.sessionId = String(q.sessionId).trim();
  const active = has(q.isActive) ? String(q.isActive).toLowerCase() : has(q.status) ? String(q.status).toLowerCase() : "";
  if (["true", "1", "active"].includes(active)) where.isActive = true;
  else if (["false", "0", "inactive"].includes(active)) where.isActive = false;
  const from = parseDate(q.from ?? q.dateFrom);
  const to = parseDate(q.to ?? q.dateTo, true);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const [items, total] = await Promise.all([
    prisma.adminLoginDevice.findMany({ where, skip: parsed.skip, take: parsed.take, orderBy: parsed.orderBy, include }),
    prisma.adminLoginDevice.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.adminLoginDevice.findUnique({ where: { id: Number(id) }, include });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
