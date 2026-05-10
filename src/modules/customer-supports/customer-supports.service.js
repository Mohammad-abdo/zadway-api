import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";

const svc = createCrudService("customerSupport", { searchableFields: [] });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

export async function addChatMessage(supportId, { message, senderType }) {
  return prisma.supportChathistory.create({
    data: {
      supportId: Number(supportId),
      message: message ?? null,
      senderType: senderType ?? "staff",
    },
  });
}
