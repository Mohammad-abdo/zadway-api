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
  const bidId = Number(id);
  return prisma.$transaction(async (tx) => {
    const bid = await tx.rideRequestBid.findUnique({ where: { id: bidId } });
    if (!bid) {
      const e = new Error("bid not found");
      e.statusCode = 404;
      throw e;
    }

    // Lock every sibling bid row for this ride request so two concurrent
    // accept calls serialize instead of both reading "no bid accepted yet"
    // and both writing isBidAccept=true.
    await tx.$queryRaw`SELECT id FROM ride_request_bids WHERE ride_request_id = ${bid.rideRequestId} FOR UPDATE`;

    const alreadyAccepted = await tx.rideRequestBid.findFirst({
      where: { rideRequestId: bid.rideRequestId, isBidAccept: true },
    });
    if (alreadyAccepted) {
      if (alreadyAccepted.id === bidId) return alreadyAccepted;
      const e = new Error("Another bid for this ride request has already been accepted.");
      e.statusCode = 409;
      throw e;
    }

    await tx.rideRequestBid.update({
      where: { id: bidId },
      data: { isBidAccept: true },
    });
    await tx.rideRequestBid.updateMany({
      where: { rideRequestId: bid.rideRequestId, id: { not: bidId } },
      data: { isBidAccept: false },
    });

    return tx.rideRequestBid.findUnique({ where: { id: bidId } });
  });
}
