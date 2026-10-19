import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("securityAuditLog", { searchableFields: ["category"] });

const USER_SELECT = { id: true, name: true, email: true, phone: true, countryCode: true, userType: true };
const STRING_FILTERS = ["category", "userType", "ip", "method", "requestId"];

function toInt(v) {
  const n = Number(v);
  return v !== undefined && v !== null && v !== "" && Number.isInteger(n) ? n : null;
}

async function attachUsers(rows) {
  const ids = [...new Set(rows.map((r) => r.userId).filter((v) => v != null))];
  if (!ids.length) return rows.map((r) => ({ ...r, user: null }));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: USER_SELECT });
  const map = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, user: r.userId != null ? map.get(r.userId) ?? null : null }));
}

function buildWhere(query, baseWhere) {
  const and = [];
  if (baseWhere && Object.keys(baseWhere).length) and.push(baseWhere);

  const userId = toInt(query.userId);
  if (userId != null) and.push({ userId });

  for (const key of STRING_FILTERS) {
    const v = typeof query[key] === "string" ? query[key].trim() : "";
    if (v) and.push({ [key]: key === "method" ? v.toUpperCase() : v });
  }

  const action = typeof query.action === "string" ? query.action.trim() : "";
  if (action) and.push({ route: { contains: action } });
  const route = typeof query.route === "string" ? query.route.trim() : "";
  if (route) and.push({ route: { contains: route } });

  const statusCode = toInt(query.statusCode);
  if (statusCode != null) and.push({ statusCode });

  const excludeId = toInt(query.excludeId);
  if (excludeId != null) and.push({ id: { not: excludeId } });

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if (from && !Number.isNaN(from.getTime())) and.push({ createdAt: { gte: from } });
  if (to && !Number.isNaN(to.getTime())) and.push({ createdAt: { lte: to } });

  return and.length ? { AND: and } : {};
}

export async function list(query) {
  const { skip, take, orderBy, where, page, limit } = parseListQuery(query, {
    searchableFields: ["category", "route", "ip", "method", "userAgent"],
    maxLimit: 500,
  });
  const finalWhere = buildWhere(query, where);
  const [rows, total] = await Promise.all([
    prisma.securityAuditLog.findMany({ where: finalWhere, skip, take, orderBy }),
    prisma.securityAuditLog.count({ where: finalWhere }),
  ]);
  return { items: await attachUsers(rows), total, page, limit };
}

export async function getById(id) {
  const row = await prisma.securityAuditLog.findUnique({ where: { id: Number(id) } });
  if (!row) return null;
  const [withUser] = await attachUsers([row]);
  return withUser;
}

const withoutUser = ({ user, ...rest } = {}) => rest;

export const create = (data) => svc.create(withoutUser(data));
export const update = (id, data) => svc.update(id, withoutUser(data));
export const remove = (id) => svc.remove(id);
