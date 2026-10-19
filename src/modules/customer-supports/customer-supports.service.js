import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("customerSupport", { searchableFields: ["message"] });

const USER_SELECT = { id: true, name: true, email: true, phone: true, countryCode: true, userType: true, avatar: true };

const SORTABLE = new Set(["id", "createdAt", "updatedAt", "status", "supportType", "userId"]);

export async function list(q = {}) {
  const parsed = parseListQuery(q, { searchableFields: ["message"], maxLimit: 500 });
  const { skip, take, page, limit } = parsed;
  const where = { ...parsed.where };

  if (q.status) {
    const statuses = String(q.status).split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length) where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (q.supportType) where.supportType = String(q.supportType);
  if (q.userId && Number(q.userId)) where.userId = Number(q.userId);

  const sortField = Object.keys(parsed.orderBy)[0];
  const orderBy = SORTABLE.has(sortField) ? parsed.orderBy : { id: "desc" };

  const [items, total] = await Promise.all([
    prisma.customerSupport.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: { select: USER_SELECT },
        _count: { select: { chatHistories: true } },
      },
    }),
    prisma.customerSupport.count({ where }),
  ]);
  return { items, total, page, limit };
}

export async function stats() {
  const [byStatus, byType, total] = await Promise.all([
    prisma.customerSupport.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customerSupport.groupBy({ by: ["supportType"], _count: { _all: true } }),
    prisma.customerSupport.count(),
  ]);
  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status ?? "pending", r._count._all])),
    byType: Object.fromEntries(byType.filter((r) => r.supportType).map((r) => [r.supportType, r._count._all])),
  };
}

export const getById = (id) =>
  prisma.customerSupport.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: USER_SELECT },
      chatHistories: { orderBy: { createdAt: "asc" } },
    },
  });

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export async function remove(id) {
  const numId = Number(id);
  await prisma.$transaction([
    prisma.supportChathistory.deleteMany({ where: { supportId: numId } }),
    prisma.customerSupport.delete({ where: { id: numId } }),
  ]);
}

export async function listByUser(userId) {
  return prisma.customerSupport.findMany({
    where: { userId: Number(userId) },
    orderBy: { createdAt: "desc" },
    include: { chatHistories: { orderBy: { createdAt: "asc" } } },
  });
}

export async function addChatMessage(supportId, { message, senderType }) {
  const id = Number(supportId);
  const [row] = await prisma.$transaction([
    prisma.supportChathistory.create({
      data: {
        supportId: id,
        message: message ?? null,
        senderType: senderType ?? "staff",
      },
    }),
    prisma.customerSupport.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);
  return row;
}
