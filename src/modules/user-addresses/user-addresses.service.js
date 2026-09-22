import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("userAddress", { searchableFields: ["title"] });

const include = {
  user: { select: { id: true, name: true, email: true, phone: true } },
};

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: ["title"], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.userId != null && String(q.userId).trim() !== "") where.userId = Number(q.userId);
  const [items, total] = await Promise.all([
    prisma.userAddress.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.userAddress.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.userAddress.findUnique({
    where: { id: Number(id) },
    include,
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

export async function listMine(userId) {
  return prisma.userAddress.findMany({
    where: { userId: Number(userId) },
    orderBy: [{ isDefault: "desc" }, { id: "desc" }],
  });
}

export async function createMine(userId, body = {}) {
  const data = {
    userId: Number(userId),
    title: body.title ?? "Home",
    address: body.address ?? null,
    latitude: body.latitude != null ? String(body.latitude) : null,
    longitude: body.longitude != null ? String(body.longitude) : null,
    isDefault: body.isDefault === true,
  };
  if (data.isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: Number(userId) },
      data: { isDefault: false },
    });
  }
  return prisma.userAddress.create({ data });
}

export async function updateMine(userId, id, body = {}) {
  const existing = await prisma.userAddress.findFirst({
    where: { id: Number(id), userId: Number(userId) },
  });
  if (!existing) return null;
  const data = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.address !== undefined) data.address = body.address;
  if (body.latitude !== undefined) data.latitude = body.latitude != null ? String(body.latitude) : null;
  if (body.longitude !== undefined) data.longitude = body.longitude != null ? String(body.longitude) : null;
  if (body.isDefault === true) {
    await prisma.userAddress.updateMany({
      where: { userId: Number(userId) },
      data: { isDefault: false },
    });
    data.isDefault = true;
  } else if (body.isDefault === false) {
    data.isDefault = false;
  }
  return prisma.userAddress.update({ where: { id: Number(id) }, data });
}

export async function removeMine(userId, id) {
  const existing = await prisma.userAddress.findFirst({
    where: { id: Number(id), userId: Number(userId) },
  });
  if (!existing) return false;
  await prisma.userAddress.delete({ where: { id: Number(id) } });
  return true;
}
