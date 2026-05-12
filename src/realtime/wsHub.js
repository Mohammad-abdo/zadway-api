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

function sendToSocket(socket, event, payload) {
  if (socket.readyState !== 1) return;
  try {
    socket.send(JSON.stringify({ event, payload, ts: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * @param {Iterable<number>} userIds
 * @param {string} event
 * @param {unknown} payload
 */
export function emitToUsers(userIds, event, payload) {
  const seen = new Set();
  for (const userId of userIds) {
    if (seen.has(userId)) continue;
    seen.add(userId);
    const set = socketsByUserId.get(userId);
    if (!set) continue;
    for (const socket of set) {
      sendToSocket(socket, event, payload);
    }
  }
}

/**
 * Notify drivers about a new product order they may claim.
 * @param {number[]} driverIds
 * @param {unknown} payload
 */
export function emitProductOrderToDrivers(driverIds, payload) {
  emitToUsers(driverIds, "new_product_order", payload);
}

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
