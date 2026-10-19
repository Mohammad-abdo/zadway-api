import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("sos", { searchableFields: ["name"] });

const USER_SELECT = { id: true, name: true, email: true, phone: true, countryCode: true, userType: true };

function toInt(v) {
  const n = Number(v);
  return v !== undefined && v !== null && v !== "" && Number.isInteger(n) ? n : null;
}

async function attachUsers(rows) {
  const ids = [...new Set(rows.map((r) => r.userId).filter((v) => v != null))];
  if (!ids.length) return rows.map((r) => ({ ...r, user: null }));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: USER_SELECT });
  const map = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({ ...r, user: map.get(r.userId) ?? null }));
}

function buildWhere(query, baseWhere) {
  const and = [];
  if (baseWhere && Object.keys(baseWhere).length) and.push(baseWhere);

  const userId = toInt(query.userId);
  if (userId != null) and.push({ userId });

  const status = toInt(query.status);
  if (status != null) and.push({ status });

  const contactNumber = typeof query.contactNumber === "string" ? query.contactNumber.trim() : "";
  if (contactNumber) and.push({ contactNumber: { contains: contactNumber } });

  const excludeId = toInt(query.excludeId);
  if (excludeId != null) and.push({ id: { not: excludeId } });

  return and.length ? { AND: and } : {};
}

export async function list(query) {
  const { skip, take, orderBy, where, page, limit } = parseListQuery(query, {
    searchableFields: ["name", "nameAr", "contactNumber"],
    maxLimit: 500,
  });
  const finalWhere = buildWhere(query, where);
  const [rows, total] = await Promise.all([
    prisma.sos.findMany({ where: finalWhere, skip, take, orderBy }),
    prisma.sos.count({ where: finalWhere }),
  ]);
  return { items: await attachUsers(rows), total, page, limit };
}

export async function getById(id) {
  const row = await prisma.sos.findUnique({ where: { id: Number(id) } });
  if (!row) return null;
  const [withUser] = await attachUsers([row]);
  return withUser;
}

const withoutUser = ({ user, ...rest } = {}) => rest;

export const create = (data) => svc.create(withoutUser(data));
export const update = (id, data) => svc.update(id, withoutUser(data));
export const remove = (id) => svc.remove(id);
