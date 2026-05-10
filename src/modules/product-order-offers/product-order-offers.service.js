import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("productOrderOffer", { searchableFields: [] });

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [] });
  const where = { ...parsed.where };
  if (q?.orderId != null && String(q.orderId).trim() !== "") {
    where.orderId = Number(q.orderId);
  }
  if (q?.driverId != null && String(q.driverId).trim() !== "") {
    where.driverId = Number(q.driverId);
  }
  const [items, total] = await Promise.all([
    prisma.productOrderOffer.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        order: { select: { id: true, status: true, total: true, currency: true } },
        driver: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
    prisma.productOrderOffer.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.productOrderOffer.findUnique({
    where: { id: Number(id) },
    include: {
      order: { select: { id: true, status: true, total: true, currency: true } },
      driver: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
