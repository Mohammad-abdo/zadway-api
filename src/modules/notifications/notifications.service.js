import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";

const svc = createCrudService("notification", { searchableFields: ["type"] });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

export async function markRead(id) {
  return prisma.notification.update({
    where: { id: Number(id) },
    data: { isRead: true, readAt: new Date() },
  });
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
