import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("supportChathistory", { searchableFields: ["message"] });

const include = {
  support: {
    select: {
      id: true,
      status: true,
      supportType: true,
      message: true,
      userId: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: ["message"], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.supportId != null && String(q.supportId).trim() !== "") {
    const supportId = Number(q.supportId);
    if (Number.isFinite(supportId)) where.supportId = supportId;
  }
  if (typeof q?.senderType === "string" && q.senderType.trim()) where.senderType = q.senderType.trim();
  const [items, total] = await Promise.all([
    prisma.supportChathistory.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.supportChathistory.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.supportChathistory.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
