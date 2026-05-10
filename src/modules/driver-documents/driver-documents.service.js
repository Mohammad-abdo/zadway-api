import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("driverDocument", { searchableFields: [] });

const include = {
  driver: { select: { id: true, name: true, email: true, phone: true } },
  document: { select: { id: true, name: true, nameI18n: true, type: true } },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.driverId != null && String(q.driverId).trim() !== "") where.driverId = Number(q.driverId);
  if (q?.documentId != null && String(q.documentId).trim() !== "") where.documentId = Number(q.documentId);
  const [items, total] = await Promise.all([
    prisma.driverDocument.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.driverDocument.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.driverDocument.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
