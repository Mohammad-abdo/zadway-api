import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("walletHistory", { searchableFields: [] });

const include = {
  wallet: { select: { id: true, currency: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
  ProductOrder: { select: { id: true, status: true, total: true, currency: true } },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: ["description"], maxLimit: 500 });
  const where = { ...parsed.where };
  for (const key of ["walletId", "userId"]) {
    if (q?.[key] != null && String(q[key]).trim() !== "") where[key] = Number(q[key]);
  }
  for (const key of ["type", "transactionType"]) {
    if (typeof q?.[key] === "string" && q[key].trim()) where[key] = q[key].trim();
  }
  const [items, total] = await Promise.all([
    prisma.walletHistory.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.walletHistory.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.walletHistory.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
