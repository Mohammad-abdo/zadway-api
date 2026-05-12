import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";
import { randomBytes } from "node:crypto";
import {
  assertEligibleDriversExist,
  findEligibleDriversSorted,
  isDriverEligibleForOrder,
} from "../../services/productOrders/productOrderMatching.js";
import { emitProductOrderToDrivers } from "../../realtime/wsHub.js";

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
  if (q?.riderUserId != null && String(q.riderUserId).trim() !== "") {
    where.riderUserId = Number(q.riderUserId);
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
    riderUserId,
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

  const dropLat = Number(dropoffLat);
  const dropLng = Number(dropoffLng);
  if (normalizedItems.length) {
    await assertEligibleDriversExist(
      prisma,
      normalizedItems.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
      dropLat,
      dropLng,
    );
  }

  const accessToken = randomBytes(24).toString("hex");

  const row = await prisma.productOrder.create({
    data: {
      guestId: Number(guestId),
      driverId: driverId != null ? Number(driverId) : undefined,
      riderUserId: riderUserId != null ? Number(riderUserId) : undefined,
      accessToken,
      status: initialStatus,
      paymentMethod: paymentMethod || "CASH",
      dropoffLat: dropLat,
      dropoffLng: dropLng,
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

  if (normalizedItems.length) {
    const sorted = await findEligibleDriversSorted(
      prisma,
      normalizedItems.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
      dropLat,
      dropLng,
    );
    const driverIds = sorted.map((s) => s.driverId);
    emitProductOrderToDrivers(driverIds, {
      orderId: row.id,
      guestId: row.guestId,
      status: row.status,
      dropoffLat: row.dropoffLat,
      dropoffLng: row.dropoffLng,
      subtotal: row.subtotal,
      total: row.total,
      currency: row.currency,
      itemCount: normalizedItems.length,
      candidates: sorted,
    });
  }

  return row;
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
  return prisma.$transaction(async (tx) => {
    const offer = await tx.productOrderOffer.findFirst({
      where: { id: Number(offerId), orderId: Number(orderId) },
    });
    if (!offer) {
      const e = new Error("offer not found");
      e.statusCode = 404;
      throw e;
    }

    const order = await tx.productOrder.findUnique({
      where: { id: Number(orderId) },
      include: { items: true },
    });
    if (!order) {
      const e = new Error("order not found");
      e.statusCode = 404;
      throw e;
    }
    if (order.status === "DELIVERED") {
      const e = new Error("Cannot accept offer: order is already delivered.");
      e.statusCode = 400;
      throw e;
    }
    if (order.status === "ACCEPTED" && order.driverId != null && order.driverId !== offer.driverId) {
      const e = new Error("Order is already assigned to another driver.");
      e.statusCode = 409;
      throw e;
    }

    await tx.productOrderOffer.updateMany({
      where: {
        orderId: Number(orderId),
        status: "PENDING",
        id: { not: offer.id },
      },
      data: { status: "REJECTED" },
    });

    await tx.productOrderOffer.update({
      where: { id: offer.id },
      data: { status: "ACCEPTED" },
    });

    return tx.productOrder.update({
      where: { id: Number(orderId) },
      data: {
        driverId: offer.driverId,
        status: "ACCEPTED",
        assignedAt: new Date(),
      },
      include: { items: true, guest: true, driver: { select: { id: true, name: true, phone: true } } },
    });
  });
}

/**
 * Driver self-assigns an open product order (first successful claim wins).
 * @param {number|string} orderId
 * @param {number|string} driverId
 */
export async function claimProductOrder(orderId, driverId) {
  const oid = Number(orderId);
  const did = Number(driverId);

  return prisma.$transaction(async (tx) => {
    const order = await tx.productOrder.findUnique({
      where: { id: oid },
      include: { items: true },
    });
    if (!order) {
      const e = new Error("order not found");
      e.statusCode = 404;
      throw e;
    }

    if (order.status === "ACCEPTED" && order.driverId === did) {
      return order;
    }

    if (order.status !== "NEW" && order.status !== "PENDING") {
      const e = new Error("Order is no longer available to claim.");
      e.statusCode = 409;
      throw e;
    }

    const lineItems = order.items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
    }));

    const eligible = await isDriverEligibleForOrder(tx, lineItems, order.dropoffLat, order.dropoffLng, did);
    if (!eligible) {
      const e = new Error("You are not eligible for this order (inventory or distance).");
      e.statusCode = 403;
      throw e;
    }

    const updated = await tx.productOrder.updateMany({
      where: {
        id: oid,
        status: { in: ["NEW", "PENDING"] },
      },
      data: {
        status: "ACCEPTED",
        driverId: did,
        assignedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const e = new Error("Order was just claimed by another driver.");
      e.statusCode = 409;
      throw e;
    }

    await tx.productOrderOffer.updateMany({
      where: { orderId: oid, status: "PENDING" },
      data: { status: "REJECTED" },
    });

    await tx.productOrderOffer.upsert({
      where: {
        orderId_driverId: {
          orderId: oid,
          driverId: did,
        },
      },
      create: {
        orderId: oid,
        driverId: did,
        status: "ACCEPTED",
      },
      update: {
        status: "ACCEPTED",
      },
    });

    return tx.productOrder.findUnique({
      where: { id: oid },
      include: {
        items: true,
        guest: true,
        driver: { select: { id: true, name: true, phone: true } },
      },
    });
  });
}
