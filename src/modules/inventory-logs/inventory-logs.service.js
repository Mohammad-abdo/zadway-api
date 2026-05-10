import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("inventoryLog", { searchableFields: ["reason"] });

const include = {
  driver: { select: { id: true, name: true, email: true, phone: true } },
  variant: {
    include: {
      product: { select: { id: true, name: true, nameI18n: true, imageUrl: true } },
      size: { select: { id: true, name: true, nameI18n: true } },
      type: { select: { id: true, name: true, nameI18n: true } },
    },
  },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: ["reason"], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.driverId != null && String(q.driverId).trim() !== "") where.driverId = Number(q.driverId);
  if (q?.variantId != null && String(q.variantId).trim() !== "") where.variantId = Number(q.variantId);
  const [items, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.inventoryLog.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.inventoryLog.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
