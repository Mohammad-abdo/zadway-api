import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("productOrderItem", { searchableFields: [] });

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [] });
  const where = { ...parsed.where };
  if (q?.orderId != null && String(q.orderId).trim() !== "") {
    where.orderId = Number(q.orderId);
  }
  const [items, total] = await Promise.all([
    prisma.productOrderItem.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        order: { select: { id: true, status: true, total: true, currency: true, driverId: true, guestId: true } },
        variant: {
          include: {
            product: { select: { id: true, name: true, nameI18n: true, imageUrl: true, categoryId: true } },
            size: { select: { id: true, name: true, nameI18n: true } },
            type: { select: { id: true, name: true, nameI18n: true } },
          },
        },
      },
    }),
    prisma.productOrderItem.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.productOrderItem.findUnique({
    where: { id: Number(id) },
    include: {
      order: { select: { id: true, status: true, total: true, currency: true, driverId: true, guestId: true } },
      variant: {
        include: {
          product: { select: { id: true, name: true, nameI18n: true, imageUrl: true, categoryId: true } },
          size: { select: { id: true, name: true, nameI18n: true } },
          type: { select: { id: true, name: true, nameI18n: true } },
        },
      },
    },
  });
}
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
