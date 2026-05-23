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
import { broadcast, emitToAdmins, emitToUsers } from "./wsHub.js";

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
 * Driver GPS update (`PATCH /drivers/me/location`).
 * @param {{ driverId: number, lat: number, lng: number, updatedAt?: Date|string|null, heading?: number|null }} payload
 */
export function emitDriverLocationUpdated(payload) {
  const body = {
    driverId: Number(payload.driverId),
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    updatedAt: toIso(payload.updatedAt) ?? new Date().toISOString(),
    ...(payload.heading != null && !Number.isNaN(Number(payload.heading))
      ? { heading: Number(payload.heading) }
      : {}),
  };
  broadcast(WS_EVENTS.DRIVER_LOCATION_UPDATED, body);
}

/**
 * @param {unknown} row
 */
export function broadcastProductOrderLocationCreated(row) {
  broadcast(WS_EVENTS.PRODUCT_ORDER_LOCATION_UPDATE_CREATED, row);
}

/**
 * @param {unknown} row
 */
export function broadcastProductOrderLocationUpdated(row) {
  broadcast(WS_EVENTS.PRODUCT_ORDER_LOCATION_UPDATE_UPDATED, row);
}

/**
 * @param {unknown} row
 */
export function broadcastBookingLocationCreated(row) {
  broadcast(WS_EVENTS.BOOKING_LOCATION_UPDATE_CREATED, row);
}

/**
 * @param {unknown} row
 */
export function broadcastBookingLocationUpdated(row) {
  broadcast(WS_EVENTS.BOOKING_LOCATION_UPDATE_UPDATED, row);
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
