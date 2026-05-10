import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("bookingLocationUpdate", { searchableFields: [] });

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], defaultLimit: 100, maxLimit: 5000 });
  const where = { ...parsed.where };
  if (q?.bookingId != null && String(q.bookingId).trim() !== "") {
    where.bookingId = Number(q.bookingId);
  }
  const [items, total] = await Promise.all([
    prisma.bookingLocationUpdate.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
    }),
    prisma.bookingLocationUpdate.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
