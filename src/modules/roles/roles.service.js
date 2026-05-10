import { createCrudService } from "../../core/crud/genericCrudService.js";

const svc = createCrudService("role", { searchableFields: ["name"] });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
