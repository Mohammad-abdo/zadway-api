import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("productOrder", { searchableFields: [] });

const invoiceInclude = {
  guest: true,
  driver: { select: { id: true, name: true, email: true, phone: true } },
  items: {
    include: {
      variant: {
        include: {
          product: true,
          size: true,
          type: true,
        },
      },
    },
  },
};

/**
 * @param {string} current
 * @param {string} next
 */
export function assertOrderStatusTransition(current, next) {
  if (current === next) return;
  if (current === "DELIVERED") {
    const e = new Error("Cannot change status: order is already delivered.");
    e.statusCode = 400;
    throw e;
  }
  if (next === "DELIVERED" && current !== "ACCEPTED") {
    const e = new Error("Delivered status is only allowed after the order is accepted.");
    e.statusCode = 400;
    throw e;
  }
}

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [] });
  const where = { ...parsed.where };
  if (q?.guestId != null && String(q.guestId).trim() !== "") {
    where.guestId = Number(q.guestId);
  }
  if (q?.driverId != null && String(q.driverId).trim() !== "") {
    where.driverId = Number(q.driverId);
  }
  if (q?.status != null && String(q.status).trim() !== "") {
    where.status = String(q.status);
  }
  const [items, total] = await Promise.all([
    prisma.productOrder.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        guest: true,
        driver: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.productOrder.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function getById(id) {
  return prisma.productOrder.findUnique({
    where: { id: Number(id) },
    include: {
      guest: true,
      driver: { select: { id: true, name: true, email: true, phone: true } },
      items: { include: { variant: true } },
      offers: true,
    },
  });
}

export async function getOrderForInvoice(id) {
  return prisma.productOrder.findUnique({
    where: { id: Number(id) },
    include: invoiceInclude,
  });
}

export async function create(data) {
  const {
    guestId,
    driverId,
    status,
    paymentMethod,
    dropoffLat,
    dropoffLng,
    dropoffNotes,
    dropoffNotesI18n,
    commissionPct,
    currency,
    items = [],
  } = data || {};

  if (!guestId) {
    const e = new Error("guestId is required");
    e.statusCode = 400;
    throw e;
  }
  if (dropoffLat == null || dropoffLng == null) {
    const e = new Error("dropoffLat and dropoffLng are required");
    e.statusCode = 400;
    throw e;
  }

  const normalizedItems = (Array.isArray(items) ? items : []).map((it) => {
    const qty = Number(it.quantity || 0);
    const unitPrice = Number(it.unitPrice || 0);
    return {
      variantId: Number(it.variantId),
      quantity: qty,
      unitPrice,
      lineTotal: Number((qty * unitPrice).toFixed(2)),
    };
  });

  const subtotal = Number(
    normalizedItems.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2),
  );
  const cPct = Number(commissionPct || 0);
  const commissionAmt = Number(((subtotal * cPct) / 100).toFixed(2));
  const total = Number((subtotal + commissionAmt).toFixed(2));

  const initialStatus = status || "NEW";
  if (initialStatus === "DELIVERED") {
    const e = new Error("Orders cannot be created as delivered.");
    e.statusCode = 400;
    throw e;
  }

  return prisma.productOrder.create({
    data: {
      guestId: Number(guestId),
      driverId: driverId != null ? Number(driverId) : undefined,
      status: initialStatus,
      paymentMethod: paymentMethod || "CASH",
      dropoffLat: Number(dropoffLat),
      dropoffLng: Number(dropoffLng),
      dropoffNotes: dropoffNotes || null,
      dropoffNotesI18n: dropoffNotesI18n || undefined,
      subtotal,
      commissionPct: cPct,
      commissionAmt,
      total,
      currency: currency || "SAR",
      items: normalizedItems.length
        ? { create: normalizedItems }
        : undefined,
    },
    include: { items: true },
  });
}

export async function update(id, data) {
  const numId = Number(id);
  const row = await prisma.productOrder.findUnique({ where: { id: numId } });
  if (!row) {
    const e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  const patch = { ...(data || {}) };
  if (Object.prototype.hasOwnProperty.call(patch, "status") && patch.status !== undefined) {
    assertOrderStatusTransition(row.status, patch.status);
    if (patch.status === "DELIVERED") {
      patch.deliveredAt = new Date();
    }
  }
  return prisma.productOrder.update({ where: { id: numId }, data: patch });
}

export const remove = (id) => svc.remove(id);

export async function updateStatus(id, status) {
  const numId = Number(id);
  const row = await prisma.productOrder.findUnique({ where: { id: numId } });
  if (!row) {
    const e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  assertOrderStatusTransition(row.status, status);
  const data = { status };
  if (status === "DELIVERED") {
    data.deliveredAt = new Date();
  }
  return prisma.productOrder.update({
    where: { id: numId },
    data,
  });
}

export async function assignDriver(orderId, driverId) {
  return prisma.productOrder.update({
    where: { id: Number(orderId) },
    data: {
      driverId: driverId != null ? Number(driverId) : null,
      assignedAt: driverId != null ? new Date() : null,
    },
  });
}

export async function acceptOffer(orderId, offerId) {
  const offer = await prisma.productOrderOffer.findFirst({
    where: { id: Number(offerId), orderId: Number(orderId) },
  });
  if (!offer) {
    const e = new Error("offer not found");
    e.statusCode = 404;
    throw e;
  }
  await prisma.productOrderOffer.update({
    where: { id: offer.id },
    data: { status: "ACCEPTED" },
  });
  return prisma.productOrder.update({
    where: { id: Number(orderId) },
    data: {
      driverId: offer.driverId,
      status: "ACCEPTED",
      assignedAt: new Date(),
    },
  });
}
