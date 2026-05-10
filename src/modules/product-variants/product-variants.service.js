import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("productVariant", { searchableFields: [] });

/** Empty SKU must be stored as null: unique index treats '' as duplicate across rows. */
function normalizeVariantWrite(data) {
  if (!data || typeof data !== "object") return data;
  const out = { ...data };
  if (Object.prototype.hasOwnProperty.call(out, "sku")) {
    const raw = out.sku;
    const s = raw == null ? "" : String(raw).trim();
    out.sku = s === "" ? null : s;
  }
  return out;
}

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [] });
  const where = { ...parsed.where };
  if (q?.productId != null && String(q.productId).trim() !== "") {
    where.productId = Number(q.productId);
  }
  const [items, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: { size: true, type: true },
    }),
    prisma.productVariant.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export const getById = (id) => svc.getById(id);

export function create(data) {
  return prisma.productVariant.create({ data: normalizeVariantWrite(data) });
}

export function update(id, data) {
  return prisma.productVariant.update({
    where: { id: Number(id) },
    data: normalizeVariantWrite(data),
  });
}

export const remove = (id) => svc.remove(id);
