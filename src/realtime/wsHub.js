let wss = null;

/** @type {Map<number, Set<import("ws").WebSocket>>} */
const socketsByUserId = new Map();

export function setWsServer(server) {
  wss = server;
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {number} userId
 */
export function registerUserSocket(socket, userId) {
  if (!userId) return;
  let set = socketsByUserId.get(userId);
  if (!set) {
    set = new Set();
    socketsByUserId.set(userId, set);
  }
  set.add(socket);
  socket.once("close", () => unregisterUserSocket(socket, userId));
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {number} userId
 */
export function unregisterUserSocket(socket, userId) {
  if (!userId) return;
  const set = socketsByUserId.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) socketsByUserId.delete(userId);
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {string} event
 * @param {unknown} payload
 */
function sendToSocket(socket, event, payload) {
  if (socket.readyState !== 1) return;
  try {
    socket.send(JSON.stringify({ event, payload, ts: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * Targeted delivery to specific user ids (driver / rider mobile apps).
 * @param {Iterable<number>} userIds
 * @param {string} event
 * @param {unknown} payload
 */
export function emitToUsers(userIds, event, payload) {
  const seen = new Set();
  for (const userId of userIds) {
    const id = Number(userId);
    if (!Number.isFinite(id) || id < 1 || seen.has(id)) continue;
    seen.add(id);
    const set = socketsByUserId.get(id);
    if (!set) continue;
    for (const socket of set) {
      sendToSocket(socket, event, payload);
    }
  }
}

/**
 * Admin dashboard clients only (`socket.userType === "admin"` set at connect).
 * @param {string} event
 * @param {unknown} payload
 */
export function emitToAdmins(event, payload) {
  if (!wss) return;
  for (const client of wss.clients) {
    if (client.readyState !== 1) continue;
    if (String(client.userType || "").toLowerCase() !== "admin") continue;
    sendToSocket(client, event, payload);
  }
}

/**
 * Broadcast to every connected WebSocket client (admin Tracking, legacy feeds).
 * @param {string} event
 * @param {unknown} payload
 */
export function broadcast(event, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ event, payload, ts: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try {
        client.send(msg);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * @deprecated Prefer `emitNewProductOrderToDrivers` from `./wsEvents.js`.
 * @param {number[]} driverIds
 * @param {unknown} payload
 */
export function emitProductOrderToDrivers(driverIds, payload) {
  emitToUsers(driverIds, "new_product_order", payload);
}
