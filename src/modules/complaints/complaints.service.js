import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("complaint", { searchableFields: [] });

const include = {
  driver: { select: { id: true, name: true, email: true, phone: true } },
  rider: { select: { id: true, name: true, email: true, phone: true } },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where: parsed.where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.complaint.count({ where: parsed.where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.complaint.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
