/**
 * Match product order line items to drivers with sufficient inventory,
 * then rank by Haversine distance to the dropoff point.
 */

const DEFAULT_MAX_KM = 50;
const DEFAULT_MAX_CANDIDATES = 30;

/**
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** @param {unknown} v */
export function parseCoord(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{ latitude?: string | null; longitude?: string | null }} user
 * @param {number} dropLat
 * @param {number} dropLng
 * @returns {number | null} distance km, or null if driver coords missing
 */
export function driverDistanceToDropoffKm(user, dropLat, dropLng) {
  const lat = parseCoord(user?.latitude);
  const lng = parseCoord(user?.longitude);
  if (lat == null || lng == null) return null;
  return haversineKm(lat, lng, dropLat, dropLng);
}

/**
 * @template T
 * @param {Set<T>} a
 * @param {Set<T>} b
 */
export function intersectSets(a, b) {
  const out = new Set();
  for (const x of a) {
    if (b.has(x)) out.add(x);
  }
  return out;
}

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {Array<{ variantId: number; quantity: number }>} items
 * @param {number} dropoffLat
 * @param {number} dropoffLng
 * @returns {Promise<{ driverId: number; distanceKm: number }[]>} nearest first; distanceKm Infinity if driver has no GPS
 */
export async function findEligibleDriversSorted(db, items, dropoffLat, dropoffLng) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const variantIds = [...new Set(items.map((i) => Number(i.variantId)))];
  const invRows = await db.driverInventoryItem.findMany({
    where: { variantId: { in: variantIds } },
    include: {
      driver: { select: { id: true, latitude: true, longitude: true, userType: true } },
    },
  });

  /** @type {Map<number, Map<number, number>>} */
  const driverVariantQty = new Map();
  for (const row of invRows) {
    if (String(row.driver?.userType || "").toLowerCase() !== "driver") continue;
    let m = driverVariantQty.get(row.driverId);
    if (!m) {
      m = new Map();
      driverVariantQty.set(row.driverId, m);
    }
    m.set(row.variantId, row.quantityOnHand);
  }

  /** @type {Set<number> | null} */
  let candidateIds = null;
  for (const line of items) {
    const vid = Number(line.variantId);
    const need = Number(line.quantity);
    /** @type {Set<number>} */
    const ok = new Set();
    for (const [driverId, vmap] of driverVariantQty) {
      const q = vmap.get(vid) ?? 0;
      if (q >= need) ok.add(driverId);
    }
    candidateIds = candidateIds == null ? ok : intersectSets(candidateIds, ok);
  }

  if (!candidateIds || candidateIds.size === 0) {
    return [];
  }

  const maxKm = Number(process.env.PRODUCT_ORDER_MAX_KM ?? DEFAULT_MAX_KM);
  const maxCand = Number(process.env.PRODUCT_ORDER_MAX_CANDIDATES ?? DEFAULT_MAX_CANDIDATES);

  const users = await db.user.findMany({
    where: { id: { in: [...candidateIds] }, userType: "driver" },
    select: { id: true, latitude: true, longitude: true },
  });

  /** @type { { driverId: number; distanceKm: number }[] } */
  const scored = [];
  for (const u of users) {
    const d = driverDistanceToDropoffKm(u, dropoffLat, dropoffLng);
    if (d == null) {
      scored.push({ driverId: u.id, distanceKm: Number.POSITIVE_INFINITY });
    } else if (d > maxKm) {
      continue;
    } else {
      scored.push({ driverId: u.id, distanceKm: d });
    }
  }

  scored.sort((a, b) => a.distanceKm - b.distanceKm);
  return scored.slice(0, maxCand);
}

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {Array<{ variantId: number; quantity: number }>} items
 * @param {number} dropoffLat
 * @param {number} dropoffLng
 */
export async function assertEligibleDriversExist(db, items, dropoffLat, dropoffLng) {
  const sorted = await findEligibleDriversSorted(db, items, dropoffLat, dropoffLng);
  if (!items.length) return;
  if (sorted.length === 0) {
    const e = new Error(
      "No driver with sufficient inventory is available near this location for the requested items.",
    );
    e.statusCode = 400;
    throw e;
  }
}

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {Array<{ variantId: number; quantity: number }>} items
 * @param {number} dropoffLat
 * @param {number} dropoffLng
 * @param {number} driverId
 */
export async function isDriverEligibleForOrder(db, items, dropoffLat, dropoffLng, driverId) {
  const sorted = await findEligibleDriversSorted(db, items, dropoffLat, dropoffLng);
  return sorted.some((r) => r.driverId === driverId);
}
