import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";

const svc = createCrudService("pages", { searchableFields: ["slug"] });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

export async function getBySlug(slug) {
  return prisma.pages.findFirst({
    where: { slug: String(slug), status: 1 },
  });
}
