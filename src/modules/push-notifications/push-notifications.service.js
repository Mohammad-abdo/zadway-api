import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { toAdminPushNotification, toPrismaPushNotificationData } from "./push-notifications.mapper.js";

const svc = createCrudService("pushNotification", { searchableFields: [] });

export async function list(q) {
  const { items, total, page, limit } = await svc.list(q);
  return { items: items.map(toAdminPushNotification), total, page, limit };
}

export async function getById(id) {
  const row = await svc.getById(id);
  return toAdminPushNotification(row);
}

export async function create(data) {
  const prismaData = toPrismaPushNotificationData(data);
  const row = await prisma.pushNotification.create({ data: prismaData });
  return toAdminPushNotification(row);
}

export async function update(id, data) {
  const prismaData = toPrismaPushNotificationData(data);
  const row = await prisma.pushNotification.update({
    where: { id: Number(id) },
    data: prismaData,
  });
  return toAdminPushNotification(row);
}

export const remove = (id) => svc.remove(id);
