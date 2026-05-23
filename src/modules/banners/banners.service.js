import prisma from "../../config/prisma.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const productInclude = {
  product: { select: { id: true, name: true, imageUrl: true } },
};

function sanitizeWrite(body) {
  if (!body || typeof body !== "object") return {};
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).trim();
  if (body.description !== undefined) {
    out.description =
      body.description === null || body.description === ""
        ? null
        : String(body.description);
  }
  if (body.image !== undefined) {
    out.image =
      body.image === null || body.image === "" ? null : String(body.image).trim();
  }
  if (body.video !== undefined) {
    out.video =
      body.video === null || body.video === "" ? null : String(body.video).trim();
  }
  if (body.productId !== undefined) {
    out.productId =
      body.productId === null || body.productId === ""
        ? null
        : Number(body.productId);
  }
  if (body.isActive !== undefined) {
    out.isActive = Boolean(body.isActive);
  }
  return out;
}

export async function list(q, { activeOnly = false } = {}) {
  const parsed = parseListQuery(q, { searchableFields: ["title", "description"] });
  const where = activeOnly ? { ...parsed.where, isActive: true } : parsed.where;
  const [items, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: productInclude,
    }),
    prisma.banner.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

/** Public/mobile catalog — active banners only. */
export function listPublic(q) {
  return list(q, { activeOnly: true });
}

export function getById(id) {
  return prisma.banner.findUnique({
    where: { id: Number(id) },
    include: productInclude,
  });
}

export async function create(data) {
  const d = sanitizeWrite(data);
  return prisma.banner.create({
    data: d,
    include: productInclude,
  });
}

export async function update(id, data) {
  const d = sanitizeWrite(data);
  return prisma.banner.update({
    where: { id: Number(id) },
    data: d,
    include: productInclude,
  });
}

export function remove(id) {
  return prisma.banner.delete({ where: { id: Number(id) } });
}
