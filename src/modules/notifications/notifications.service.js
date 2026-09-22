import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { toAdminNotification, toPrismaNotificationData } from "./notifications.mapper.js";

const svc = createCrudService("notification", { searchableFields: ["type"] });

export async function list(q) {
  const { items, total, page, limit } = await svc.list(q);
  return { items: items.map(toAdminNotification), total, page, limit };
}

/** Mobile: notifications for the authenticated user only. */
export async function listMine(userId, q = {}) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 30));
  const where = {
    notifiableType: "User",
    notifiableId: Number(userId),
  };
  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { items: rows.map(toAdminNotification), total, page, limit };
}

export async function getById(id) {
  const row = await svc.getById(id);
  return toAdminNotification(row);
}

export async function create(data) {
  const prismaData = toPrismaNotificationData(data);
  const row = await prisma.notification.create({ data: prismaData });
  return toAdminNotification(row);
}

export async function update(id, data) {
  const existing = await prisma.notification.findUnique({ where: { id: Number(id) } });
  const prismaData = toPrismaNotificationData(data, { existing });
  const row = await prisma.notification.update({
    where: { id: Number(id) },
    data: prismaData,
  });
  return toAdminNotification(row);
}

export const remove = (id) => svc.remove(id);

export async function markRead(id) {
  const row = await prisma.notification.update({
    where: { id: Number(id) },
    data: { isRead: true, readAt: new Date() },
  });
  return toAdminNotification(row);
}

export async function markAllReadForUser(userId) {
  return prisma.notification.updateMany({
    where: {
      notifiableType: "User",
      notifiableId: Number(userId),
      isRead: false,
    },
    data: { isRead: true, readAt: new Date() },
  });
}
