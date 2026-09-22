/**
 * Central WebSocket event emitters (native `ws`, path `/ws`, JWT via `?token=`).
 *
 * | Event | Delivery | Consumers |
 * |-------|----------|-----------|
 * | `new_product_order` | Targeted (eligible driver user ids) | Driver mobile app |
 * | `order_claimed` | Driver + admins | Driver app, admin dashboard |
 * | `order_status_changed` | Driver, rider (if any), admins | Mobile + admin |
 * | `driver_location_updated` | Broadcast | Admin Tracking, optional order tracking |
 * | `product_order_location_update.*` | Broadcast | Admin Tracking |
 * | `booking_location_update.*` | Broadcast | Admin Tracking |
 */
import prisma from "../config/prisma.js";
import { emitToAdmins, emitToUsers } from "./wsHub.js";

/** @typedef {import("@prisma/client").ProductOrderStatus} ProductOrderStatus */

export const WS_EVENTS = Object.freeze({
  NEW_PRODUCT_ORDER: "new_product_order",
  ORDER_CLAIMED: "order_claimed",
  ORDER_STATUS_CHANGED: "order_status_changed",
  DRIVER_LOCATION_UPDATED: "driver_location_updated",
  PRODUCT_ORDER_LOCATION_UPDATE_CREATED: "product_order_location_update.created",
  PRODUCT_ORDER_LOCATION_UPDATE_UPDATED: "product_order_location_update.updated",
  BOOKING_LOCATION_UPDATE_CREATED: "booking_location_update.created",
  BOOKING_LOCATION_UPDATE_UPDATED: "booking_location_update.updated",
});

export const PRODUCT_ORDER_STATUSES = Object.freeze([
  "NEW",
  "PENDING",
  "ACCEPTED",
  "PICKED_UP",
  "ON_THE_WAY",
  "REJECTED",
  "DELIVERED",
  "CANCELLED",
]);

/**
 * @param {Date|string|null|undefined} value
 * @returns {string|null}
 */
function toIso(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * @param {number|null|undefined} driverId
 * @param {number|null|undefined} riderUserId
 * @returns {number[]}
 */
function orderStakeholderIds(driverId, riderUserId) {
  return [driverId, riderUserId]
    .map((id) => (id != null ? Number(id) : null))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/**
 * Notify eligible drivers about a new open order.
 * @param {number[]} driverIds
 * @param {Record<string, unknown>} payload
 */
export function emitNewProductOrderToDrivers(driverIds, payload) {
  emitToUsers(driverIds, WS_EVENTS.NEW_PRODUCT_ORDER, payload);
}

/**
 * Driver claimed an order (`POST /drivers/me/product-orders/:id/claim`).
 * @param {{ orderId: number, driverId: number, status: string, assignedAt?: Date|string|null }} payload
 */
export function emitOrderClaimed(payload) {
  const body = {
    orderId: Number(payload.orderId),
    driverId: Number(payload.driverId),
    status: payload.status,
    assignedAt: toIso(payload.assignedAt),
  };
  emitToUsers([body.driverId], WS_EVENTS.ORDER_CLAIMED, body);
  emitToAdmins(WS_EVENTS.ORDER_CLAIMED, body);
}

/**
 * Product order status transition (admin PATCH, driver claim, etc.).
 * @param {{
 *   orderId: number,
 *   oldStatus: string,
 *   newStatus: string,
 *   driverId?: number|null,
 *   riderUserId?: number|null,
 * }} payload
 */
export function emitOrderStatusChanged(payload) {
  const body = {
    orderId: Number(payload.orderId),
    oldStatus: payload.oldStatus,
    newStatus: payload.newStatus,
  };
  const stakeholders = orderStakeholderIds(payload.driverId, payload.riderUserId);
  if (stakeholders.length) {
    emitToUsers(stakeholders, WS_EVENTS.ORDER_STATUS_CHANGED, body);
  }
  emitToAdmins(WS_EVENTS.ORDER_STATUS_CHANGED, body);
}

/**
 * Find the rider currently on this driver's active delivery, if any, so a
 * live-location event can be targeted to them in addition to admins/self.
 * @param {number} driverId
 * @returns {Promise<number|null>}
 */
async function findActiveOrderRiderIdForDriver(driverId) {
  try {
    const order = await prisma.productOrder.findFirst({
      where: {
        driverId,
        status: { in: ["ACCEPTED", "PICKED_UP", "ON_THE_WAY"] },
        riderUserId: { not: null },
      },
      select: { riderUserId: true },
      orderBy: { assignedAt: "desc" },
    });
    return order?.riderUserId ?? null;
  } catch {
    return null;
  }
}

/**
 * Driver GPS update (`PATCH /drivers/me/location`).
 * Targeted delivery only (admins + the driver + the rider on their active
 * order, if any) — never a global broadcast, which would leak every driver's
 * live location to every connected client.
 * @param {{ driverId: number, lat: number, lng: number, updatedAt?: Date|string|null, heading?: number|null }} payload
 */
export async function emitDriverLocationUpdated(payload) {
  const driverId = Number(payload.driverId);
  const body = {
    driverId,
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    updatedAt: toIso(payload.updatedAt) ?? new Date().toISOString(),
    ...(payload.heading != null && !Number.isNaN(Number(payload.heading))
      ? { heading: Number(payload.heading) }
      : {}),
  };
  emitToAdmins(WS_EVENTS.DRIVER_LOCATION_UPDATED, body);
  const riderId = await findActiveOrderRiderIdForDriver(driverId);
  const recipients = riderId != null ? [driverId, riderId] : [driverId];
  emitToUsers(recipients, WS_EVENTS.DRIVER_LOCATION_UPDATED, body);
}

/**
 * Resolve the stakeholder user ids (driver + rider) for a product order.
 * @param {number|null|undefined} orderId
 * @param {number|null|undefined} rowDriverId
 * @returns {Promise<number[]>}
 */
async function findProductOrderStakeholderIds(orderId, rowDriverId) {
  const ids = new Set();
  if (rowDriverId != null) ids.add(Number(rowDriverId));
  if (orderId != null) {
    try {
      const order = await prisma.productOrder.findUnique({
        where: { id: Number(orderId) },
        select: { driverId: true, riderUserId: true },
      });
      if (order?.driverId != null) ids.add(Number(order.driverId));
      if (order?.riderUserId != null) ids.add(Number(order.riderUserId));
    } catch {
      // best-effort enrichment only
    }
  }
  return Array.from(ids);
}

/**
 * Targeted delivery only (admins + the order's driver/rider) — a product
 * order's location trail is customer-sensitive data and must not reach every
 * connected client.
 * @param {string} event
 * @param {{ orderId?: number, driverId?: number }} row
 */
async function notifyProductOrderLocation(event, row) {
  emitToAdmins(event, row);
  const stakeholders = await findProductOrderStakeholderIds(row?.orderId, row?.driverId);
  if (stakeholders.length) emitToUsers(stakeholders, event, row);
}

/**
 * @param {{ orderId?: number, driverId?: number }} row
 */
export function broadcastProductOrderLocationCreated(row) {
  return notifyProductOrderLocation(WS_EVENTS.PRODUCT_ORDER_LOCATION_UPDATE_CREATED, row);
}

/**
 * @param {{ orderId?: number, driverId?: number }} row
 */
export function broadcastProductOrderLocationUpdated(row) {
  return notifyProductOrderLocation(WS_EVENTS.PRODUCT_ORDER_LOCATION_UPDATE_UPDATED, row);
}

/**
 * Booking has no owning-user relation in the current schema (legacy table,
 * no `Booking` model) — restrict to admins only rather than leaking every
 * booking's location trail to every connected client via a global broadcast.
 * @param {unknown} row
 */
export function broadcastBookingLocationCreated(row) {
  emitToAdmins(WS_EVENTS.BOOKING_LOCATION_UPDATE_CREATED, row);
}

/**
 * @param {unknown} row
 */
export function broadcastBookingLocationUpdated(row) {
  emitToAdmins(WS_EVENTS.BOOKING_LOCATION_UPDATE_UPDATED, row);
}

/**
 * @param {{ id: number, status: string, driverId?: number|null, riderUserId?: number|null }} order
 * @param {string} oldStatus
 */
export function notifyOrderStatusChanged(order, oldStatus) {
  if (!order || oldStatus === order.status) return;
  emitOrderStatusChanged({
    orderId: order.id,
    oldStatus,
    newStatus: order.status,
    driverId: order.driverId,
    riderUserId: order.riderUserId,
  });
}

/**
 * @param {{ id: number, driverId: number, status: string, assignedAt?: Date|string|null, riderUserId?: number|null }} order
 * @param {string} oldStatus
 */
export function notifyOrderClaimed(order, oldStatus) {
  if (!order?.driverId) return;
  emitOrderClaimed({
    orderId: order.id,
    driverId: order.driverId,
    status: order.status,
    assignedAt: order.assignedAt,
  });
  notifyOrderStatusChanged(order, oldStatus);
}
