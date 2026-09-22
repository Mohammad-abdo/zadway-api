import prisma from "../../config/prisma.js";
import { parseListQuery } from "../utils/pagination.js";

// Fields no client should ever be able to set directly through a generic
// create/update body, regardless of how permissive a module's own validator
// is (many use a bare `.passthrough()` schema). This is a defensive floor,
// not a substitute for a real per-module allowlist.
const NEVER_MASS_ASSIGNABLE_FIELDS = ["id", "createdAt", "updatedAt"];

function stripNeverMassAssignableFields(data) {
  if (!data || typeof data !== "object") return data;
  const clean = { ...data };
  for (const field of NEVER_MASS_ASSIGNABLE_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/**
 * @param {string} modelKey - prisma delegate key, e.g. "user", "productOrder"
 */
export function createCrudService(modelKey, { searchableFields = [], idParam = "id" } = {}) {
  const delegate = prisma[modelKey];
  if (!delegate) {
    throw new Error(`Prisma model not found: ${modelKey}`);
  }

  return {
    async list(query) {
      const parsed = parseListQuery(query, { searchableFields });
      const { skip, take, orderBy, where, page, limit } = parsed;
      const [items, total] = await Promise.all([
        delegate.findMany({ where, skip, take, orderBy }),
        delegate.count({ where }),
      ]);
      return { items, total, page, limit };
    },

    async getById(id) {
      const numId = Number(id);
      return delegate.findUnique({ where: { id: numId } });
    },

    async create(data) {
      return delegate.create({ data: stripNeverMassAssignableFields(data) });
    },

    async update(id, data) {
      const numId = Number(id);
      return delegate.update({ where: { id: numId }, data: stripNeverMassAssignableFields(data) });
    },

    async remove(id) {
      const numId = Number(id);
      return delegate.delete({ where: { id: numId } });
    },
  };
}
