import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("userAddress", { searchableFields: ["title"] });

const include = {
  user: { select: { id: true, name: true, email: true, phone: true } },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: ["title"], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.userId != null && String(q.userId).trim() !== "") where.userId = Number(q.userId);
  const [items, total] = await Promise.all([
    prisma.userAddress.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.userAddress.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.userAddress.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
