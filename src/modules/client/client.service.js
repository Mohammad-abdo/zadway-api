import prisma from "../../config/prisma.js";
import { parseListQuery } from "../../core/utils/pagination.js";
import * as productOrdersService from "../product-orders/product-orders.service.js";

/** @param {Record<string, unknown>} order */
export function stripAccessToken(order) {
  if (!order || typeof order !== "object") return order;
  const { accessToken: _a, ...rest } = order;
  return rest;
}

/**
 * @param {{ name?: string | null; phone?: string | number | null }} input
 */
export async function findOrCreateGuest(input) {
  const name =
    input.name != null && String(input.name).trim() !== "" ? String(input.name).trim() : null;
  const phoneNorm =
    input.phone != null && String(input.phone).trim() !== "" ? String(input.phone).trim() : null;
  if (!phoneNorm && !name) {
    const e = new Error("guest name or phone is required");
    e.statusCode = 400;
    throw e;
  }
  if (phoneNorm) {
    const found = await prisma.guestCustomer.findFirst({ where: { phone: phoneNorm } });
    if (found) {
      if (name && !found.name) {
        return prisma.guestCustomer.update({ where: { id: found.id }, data: { name } });
      }
      return found;
    }
  }
  return prisma.guestCustomer.create({
    data: { name, phone: phoneNorm },
  });
}

/**
 * @param {object} body
 * @param {{ id: number; phone?: number | null; name?: string | null; displayName?: string | null; userType?: string | null } | null} riderUser from optionalAuth / auth
 */
export async function resolveGuestIdForClientOrder(body, riderUser) {
  const b = body && typeof body === "object" ? body : {};
  if (b.guestId != null && String(b.guestId).trim() !== "") {
    if (!riderUser || String(riderUser.userType || "").toLowerCase() !== "rider") {
      const e = new Error("guestId requires rider authentication");
      e.statusCode = 401;
      throw e;
    }
    const gid = Number(b.guestId);
    const g = await prisma.guestCustomer.findUnique({ where: { id: gid } });
    if (!g) {
      const e = new Error("guest not found");
      e.statusCode = 404;
      throw e;
    }
    return gid;
  }

  const guestPayload = b.guest && typeof b.guest === "object" ? b.guest : null;
  if (guestPayload) {
    return (await findOrCreateGuest(guestPayload)).id;
  }

  if (riderUser && String(riderUser.userType || "").toLowerCase() === "rider") {
    const phone = riderUser.phone != null ? String(riderUser.phone) : null;
    const display = riderUser.displayName || riderUser.name || null;
    if (phone) {
      return (await findOrCreateGuest({ name: display, phone })).id;
    }
  }

  const e = new Error("Provide guestId, guest { name, phone }, or authenticate as a rider with a phone on file");
  e.statusCode = 400;
  throw e;
}

export async function getCatalog() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ take: 200, orderBy: { id: "asc" } }),
    prisma.product.findMany({
      where: { isActive: true },
      take: 200,
      orderBy: { id: "desc" },
      include: {
        category: true,
        variants: {
          take: 30,
          orderBy: { id: "asc" },
          include: { size: true, type: true },
        },
      },
    }),
  ]);
  return { categories, products };
}

export async function listVariantsForProduct(productId) {
  const p = await prisma.product.findUnique({
    where: { id: Number(productId) },
    select: { id: true, isActive: true },
  });
  if (!p) {
    const e = new Error("product not found");
    e.statusCode = 404;
    throw e;
  }
  if (!p.isActive) {
    const e = new Error("product is not active");
    e.statusCode = 404;
    throw e;
  }
  return prisma.productVariant.findMany({
    where: { productId: p.id },
    orderBy: { id: "asc" },
    include: { size: true, type: true, product: { select: { id: true, name: true, nameI18n: true } } },
  });
}

/**
 * @param {object} body order payload (same shape as admin product order create)
 * @param {import("@prisma/client").User | null} riderUser
 */
export async function createClientOrder(body, riderUser) {
  const guestId = await resolveGuestIdForClientOrder(body, riderUser);
  const riderUserId =
    riderUser && String(riderUser.userType || "").toLowerCase() === "rider" ? riderUser.id : undefined;

  const b = body && typeof body === "object" ? body : {};
  const { guest: _g, guestId: _gi, ...payload } = b;

  const status = payload.status === "PENDING" || payload.status === "NEW" ? payload.status : "NEW";

  const order = await productOrdersService.create({
    ...payload,
    guestId,
    riderUserId,
    status,
  });

  const isRider = riderUserId != null;
  return {
    order: stripAccessToken(order),
    accessToken: isRider ? undefined : order.accessToken,
  };
}

/**
 * @param {number|string} orderId
 * @param {{ riderUserId?: number; accessTokenHeader?: string | null }} auth
 */
export async function getClientOrder(orderId, auth) {
  const order = await prisma.productOrder.findUnique({
    where: { id: Number(orderId) },
    include: {
      guest: true,
      driver: { select: { id: true, name: true, phone: true, email: true } },
      items: {
        include: {
          variant: { include: { product: true, size: true, type: true } },
        },
      },
    },
  });
  if (!order) {
    const e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  const hdr = auth.accessTokenHeader != null ? String(auth.accessTokenHeader).trim() : "";
  if (auth.riderUserId != null && order.riderUserId === Number(auth.riderUserId)) {
    return stripAccessToken(order);
  }
  if (hdr && order.accessToken && hdr === order.accessToken) {
    return stripAccessToken(order);
  }
  const e = new Error("forbidden");
  e.statusCode = 403;
  throw e;
}

/**
 * @param {number} riderUserId
 * @param {object} query
 */
export async function listRiderOrders(riderUserId, query) {
  const parsed = parseListQuery(query, { searchableFields: [] });
  const where = { ...parsed.where, riderUserId: Number(riderUserId) };
  const [items, total] = await Promise.all([
    prisma.productOrder.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        guest: true,
        driver: { select: { id: true, name: true, phone: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.productOrder.count({ where }),
  ]);
  return {
    items: items.map((o) => stripAccessToken(o)),
    total,
    page: parsed.page,
    limit: parsed.limit,
  };
}
