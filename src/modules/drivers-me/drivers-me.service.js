import prisma from "../../config/prisma.js";

const includeDetail = {
  driver: { select: { id: true, name: true, email: true, phone: true } },
  variant: {
    include: {
      product: { select: { id: true, name: true, nameI18n: true, imageUrl: true, isActive: true } },
      size: { select: { id: true, name: true, nameI18n: true } },
      type: { select: { id: true, name: true, nameI18n: true } },
    },
  },
};

export async function listMyInventory(driverId) {
  return prisma.driverInventoryItem.findMany({
    where: { driverId: Number(driverId) },
    orderBy: { id: "desc" },
    include: includeDetail,
  });
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
  return row;
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
  return prisma.driverInventoryItem.update({
    where: { id: Number(id) },
    data,
    include: includeDetail,
  });
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
