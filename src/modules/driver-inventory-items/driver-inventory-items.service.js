import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("driverInventoryItem", { searchableFields: [] });

const includeDetail = {
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
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const [items, total] = await Promise.all([
    prisma.driverInventoryItem.findMany({
      where: parsed.where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: includeDetail,
    }),
    prisma.driverInventoryItem.count({ where: parsed.where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.driverInventoryItem.findUnique({
    where: { id: Number(id) },
    include: includeDetail,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
