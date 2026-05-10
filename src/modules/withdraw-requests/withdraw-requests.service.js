import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("withdrawRequest", { searchableFields: [] });

const include = { user: { select: { id: true, name: true, email: true, phone: true } } };

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const [items, total] = await Promise.all([
    prisma.withdrawRequest.findMany({
      where: parsed.where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.withdrawRequest.count({ where: parsed.where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.withdrawRequest.findUnique({
    where: { id: Number(id) },
    include,
  });
}
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

/** status codes: 0 pending, 1 approved, 2 rejected (convention) */
export async function approve(id) {
  return prisma.withdrawRequest.update({
    where: { id: Number(id) },
    data: { status: 1 },
  });
}

export async function reject(id) {
  return prisma.withdrawRequest.update({
    where: { id: Number(id) },
    data: { status: 2 },
  });
}
