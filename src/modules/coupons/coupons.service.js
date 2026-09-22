import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("coupon", { searchableFields: ["code", "title", "titleAr"] });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

/** Public/mobile — active coupons within date window. */
export async function listPublic(q) {
  const parsed = parseListQuery(q, { searchableFields: ["code", "title", "titleAr"], maxLimit: 50 });
  const now = new Date();
  const where = {
    status: 1,
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };
  const [items, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: [{ discount: "desc" }, { id: "desc" }],
    }),
    prisma.coupon.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}
