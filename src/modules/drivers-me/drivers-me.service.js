import prisma from "../../config/prisma.js";
import { emitDriverLocationUpdated } from "../../realtime/wsEvents.js";
import { parseListQuery } from "../../core/utils/pagination.js";
import { isDriverEligibleForOrder } from "../../services/productOrders/productOrderMatching.js";
import * as clientService from "../client/client.service.js";
import { enrichOrderLineItem, enrichVariantWithNestedProduct } from "../../core/utils/variantImages.js";

const includeDetail = {
  driver: { select: { id: true, name: true, email: true, phone: true } },
  variant: {
    include: {
      product: {
        select: { id: true, name: true, nameI18n: true, imageUrl: true, images: true, isActive: true },
      },
      size: { select: { id: true, name: true, nameI18n: true } },
      type: { select: { id: true, name: true, nameI18n: true } },
    },
  },
};

function enrichInventoryRow(row) {
  if (!row?.variant) return row;
  return { ...row, variant: enrichVariantWithNestedProduct(row.variant) };
}

export async function listMyInventory(driverId) {
  const rows = await prisma.driverInventoryItem.findMany({
    where: { driverId: Number(driverId) },
    orderBy: { id: "desc" },
    include: includeDetail,
  });
  return rows.map(enrichInventoryRow);
}

/**
 * @param {number} driverId
 * @param {object} data
 */
export async function createMyInventory(driverId, data) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: Number(data.variantId) },
    include: { product: { select: { id: true, isActive: true } } },
  });
  if (!variant) {
    const e = new Error("variant not found");
    e.statusCode = 404;
    throw e;
  }
  if (!variant.product?.isActive) {
    const e = new Error("product is not active");
    e.statusCode = 400;
    throw e;
  }

  const row = await prisma.driverInventoryItem.create({
    data: {
      driverId: Number(driverId),
      variantId: Number(data.variantId),
      quantityOnHand: Number(data.quantityOnHand ?? 0),
      price: Number(data.price),
      currency: data.currency || "SAR",
    },
    include: includeDetail,
  });
  return enrichInventoryRow(row);
}

/**
 * @param {number} driverId
 * @param {number} id
 * @param {object} patch
 */
export async function updateMyInventory(driverId, id, patch) {
  const existing = await prisma.driverInventoryItem.findUnique({
    where: { id: Number(id) },
  });
  if (!existing) {
    const e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  if (existing.driverId !== Number(driverId)) {
    const e = new Error("forbidden");
    e.statusCode = 403;
    throw e;
  }
  /** @type {{ quantityOnHand?: number; price?: number; currency?: string }} */
  const data = {};
  if (patch.quantityOnHand != null) data.quantityOnHand = Number(patch.quantityOnHand);
  if (patch.price != null) data.price = Number(patch.price);
  if (patch.currency != null) data.currency = String(patch.currency);
  return enrichInventoryRow(
    await prisma.driverInventoryItem.update({
      where: { id: Number(id) },
      data,
      include: includeDetail,
    }),
  );
}

/**
 * @param {number} driverId
 * @param {number} id
 */
export async function removeMyInventory(driverId, id) {
  const existing = await prisma.driverInventoryItem.findUnique({
    where: { id: Number(id) },
  });
  if (!existing) {
    const e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  if (existing.driverId !== Number(driverId)) {
    const e = new Error("forbidden");
    e.statusCode = 403;
    throw e;
  }
  await prisma.driverInventoryItem.delete({ where: { id: Number(id) } });
}

const orderListInclude = {
  guest: true,
  driver: { select: { id: true, name: true, phone: true } },
  _count: { select: { items: true } },
};

/**
 * @param {number} driverId
 * @param {{ latitude?: unknown; longitude?: unknown; currentHeading?: unknown }} body
 */
export async function updateMyLocation(driverId, body) {
  const data = {};
  if (body.latitude !== undefined && body.latitude !== null && String(body.latitude).trim() !== "") {
    data.latitude = String(body.latitude).trim();
  }
  if (body.longitude !== undefined && body.longitude !== null && String(body.longitude).trim() !== "") {
    data.longitude = String(body.longitude).trim();
  }
  if (body.currentHeading != null && !Number.isNaN(Number(body.currentHeading))) {
    data.currentHeading = Number(body.currentHeading);
  }
  data.lastLocationUpdateAt = new Date();
  const row = await prisma.user.update({
    where: { id: Number(driverId) },
    data,
    select: { id: true, latitude: true, longitude: true, currentHeading: true, lastLocationUpdateAt: true },
  });

  if (row.latitude != null && row.longitude != null) {
    emitDriverLocationUpdated({
      driverId: row.id,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      updatedAt: row.lastLocationUpdateAt,
      heading: row.currentHeading,
    });
  }

  return row;
}

/**
 * @param {number} driverId
 * @param {object} query filter=mine|open
 */
export async function listMyProductOrders(driverId, query) {
  const filter = String(query.filter || "open").toLowerCase();
  const parsed = parseListQuery(query, { searchableFields: [], maxLimit: 100, defaultLimit: 30 });

  if (filter === "mine") {
    const where = { ...parsed.where, driverId: Number(driverId) };
    const [items, total] = await Promise.all([
      prisma.productOrder.findMany({
        where,
        skip: parsed.skip,
        take: parsed.take,
        orderBy: parsed.orderBy,
        include: orderListInclude,
      }),
      prisma.productOrder.count({ where }),
    ]);
    return {
      items: items.map((o) => clientService.stripAccessToken(o)),
      total,
      page: parsed.page,
      limit: parsed.limit,
    };
  }

  const where = {
    ...parsed.where,
    status: { in: ["NEW", "PENDING"] },
  };
  const [items, total] = await Promise.all([
    prisma.productOrder.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        ...orderListInclude,
        items: { select: { variantId: true, quantity: true } },
      },
    }),
    prisma.productOrder.count({ where }),
  ]);
  return {
    items: items.map((o) => clientService.stripAccessToken(o)),
    total,
    page: parsed.page,
    limit: parsed.limit,
  };
}

/**
 * @param {number} driverId
 * @param {number|string} orderId
 */
export async function getMyProductOrder(driverId, orderId) {
  const order = await prisma.productOrder.findUnique({
    where: { id: Number(orderId) },
    include: {
      guest: true,
      driver: { select: { id: true, name: true, phone: true, email: true } },
      items: { include: { variant: { include: { product: true, size: true, type: true } } } },
    },
  });
  if (!order) {
    const e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  if (order.driverId === Number(driverId)) {
    return clientService.stripAccessToken({
      ...order,
      items: order.items.map(enrichOrderLineItem),
    });
  }
  if (order.status === "NEW" || order.status === "PENDING") {
    const lineItems = order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    const ok = await isDriverEligibleForOrder(
      prisma,
      lineItems,
      order.dropoffLat,
      order.dropoffLng,
      driverId,
    );
    if (ok)
      return clientService.stripAccessToken({
        ...order,
        items: order.items.map(enrichOrderLineItem),
      });
  }
  const e = new Error("forbidden");
  e.statusCode = 403;
  throw e;
}

/**
 * @param {number} driverId
 * @param {number|string} orderId
 * @param {number|null|undefined} offeredPrice
 */
export async function upsertMyOffer(driverId, orderId, offeredPrice) {
  const order = await prisma.productOrder.findUnique({
    where: { id: Number(orderId) },
    include: { items: true },
  });
  if (!order) {
    const e = new Error("order not found");
    e.statusCode = 404;
    throw e;
  }
  if (order.status !== "NEW" && order.status !== "PENDING") {
    const e = new Error("Offers are only allowed for open orders.");
    e.statusCode = 400;
    throw e;
  }
  const lineItems = order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  const ok = await isDriverEligibleForOrder(
    prisma,
    lineItems,
    order.dropoffLat,
    order.dropoffLng,
    driverId,
  );
  if (!ok) {
    const e = new Error("You are not eligible to offer on this order.");
    e.statusCode = 403;
    throw e;
  }
  return prisma.productOrderOffer.upsert({
    where: {
      orderId_driverId: {
        orderId: Number(orderId),
        driverId: Number(driverId),
      },
    },
    create: {
      orderId: Number(orderId),
      driverId: Number(driverId),
      offeredPrice: offeredPrice != null ? Number(offeredPrice) : null,
      status: "PENDING",
    },
    update: {
      offeredPrice: offeredPrice != null ? Number(offeredPrice) : null,
      status: "PENDING",
    },
  });
}
