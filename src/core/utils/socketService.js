/**
 * Legacy Socket.IO helper stubs (unused at runtime).
 * Realtime delivery uses native `ws` — see `src/realtime/wsEvents.js`.
 */
export function emitToUser(io, userId, event, data) {
  if (!io) return;
  io.to(`user-${userId}`).emit(event, data);
}

export function emitToDriver(io, driverId, event, data) {
  if (!io) return;
  io.to(`driver-${driverId}`).emit(event, data);
}

export function emitToRide(io, rideId, event, data) {
  if (!io) return;
  io.to(`ride-${rideId}`).emit(event, data);
}

export function emitToAll(io, event, data) {
  if (!io) return;
  io.emit(event, data);
}

export function emitToAllDrivers(io, event, data) {
  if (!io) return;
  io.emit(event, data);
}

export function emitRideRequestToDrivers(io, driverIds, rideRequest) {
  if (!io) return;
  driverIds.forEach((driverId) => {
    io.to(`driver-${driverId}`).emit("new_ride_request", rideRequest);
  });
}

export function emitDriverLocationUpdate(io, driverId, data) {
  if (!io) return;
  const lat = data.latitude ?? data.lat;
  const lng = data.longitude ?? data.lng;
  io.emit("driver-location-update", {
    driverId,
    lat,
    lng,
    heading: data.currentHeading ?? data.heading ?? undefined,
    name:
      data.firstName || data.lastName ? `${data.firstName || ""} ${data.lastName || ""}`.trim() : undefined,
    status: data.isOnline ? (data.isAvailable ? "online" : "busy") : "offline",
    isAvailable: data.isAvailable,
  });
}

export {
  emitNewProductOrderToDrivers,
  emitOrderClaimed,
  emitOrderStatusChanged,
  emitDriverLocationUpdated,
  WS_EVENTS,
} from "../../realtime/wsEvents.js";

/** @deprecated Use `emitNewProductOrderToDrivers` from `wsEvents.js`. */
export { emitProductOrderToDrivers } from "../../realtime/wsHub.js";
