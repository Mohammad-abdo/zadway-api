import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("rideRequestBid", { searchableFields: [] });

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const [items, total] = await Promise.all([
    prisma.rideRequestBid.findMany({
      where: parsed.where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        driver: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
    prisma.rideRequestBid.count({ where: parsed.where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  const numId = Number(id);
  return prisma.rideRequestBid.findUnique({
    where: { id: numId },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          displayName: true,
          latitude: true,
          longitude: true,
          currentHeading: true,
          lastLocationUpdateAt: true,
          isOnline: true,
        },
      },
    },
  });
}

export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

export async function acceptBid(id) {
  return prisma.rideRequestBid.update({
    where: { id: Number(id) },
    data: { isBidAccept: true },
  });
}
