import prisma from "../../config/prisma.js";

/** @param {string[]} permissionNames */
function hasPerm(permissionNames, viewName, manageName) {
  if (!permissionNames?.length) return false;
  if (permissionNames.includes("*")) return true;
  return permissionNames.includes(viewName) || permissionNames.includes(manageName);
}

function num(v) {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current, previous) {
  if (previous === 0 && current === 0) return undefined;
  if (previous === 0) return current > 0 ? 100 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function startOfDayUtc(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDaysUtc(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function formatDay(d) {
  const x = new Date(d);
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/**
 * Build contiguous daily rows for charts (length = days).
 * @param {Date} startInclusive UTC start
 * @param {number} days
 * @param {Map<string, { orders: number, revenue: number, users: number }>} byDay key yyyy-mm-dd
 */
function buildSeries(startInclusive, days, byDay) {
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const d = addDaysUtc(startInclusive, i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key) || { orders: 0, revenue: 0, users: 0 };
    out.push({
      date: formatDay(d),
      orders: row.orders,
      revenue: Math.round(row.revenue * 100) / 100,
      users: row.users,
    });
  }
  return out;
}

async function countRange(model, whereBase, from, toExclusive) {
  return model.count({
    where: {
      ...whereBase,
      createdAt: {
        gte: from,
        ...(toExclusive ? { lt: toExclusive } : {}),
      },
    },
  });
}

async function sumOrderTotalRange(from, toExclusive) {
  const r = await prisma.productOrder.aggregate({
    where: {
      createdAt: {
        gte: from,
        ...(toExclusive ? { lt: toExclusive } : {}),
      },
    },
    _sum: { total: true },
  });
  return Number(r._sum.total ?? 0);
}

/**
 * Dashboard aggregates for admin UI. Omits metrics the user cannot view (RBAC).
 * @param {string[]} permissionNames
 */
export async function getDashboardStats(permissionNames) {
  const now = new Date();
  const curStart = startOfDayUtc(addDaysUtc(now, -7));
  const prevStart = startOfDayUtc(addDaysUtc(now, -14));
  const prevEnd = curStart;

  const pu = hasPerm(permissionNames, "users.view", "users.manage");
  const pd = pu;
  const pp = hasPerm(permissionNames, "products.view", "products.manage");
  const po = hasPerm(permissionNames, "orders.view", "orders.manage");
  const pr = hasPerm(permissionNames, "ride_request_bids.view", "ride_request_bids.manage");
  const pc = hasPerm(permissionNames, "complaints.view", "complaints.manage");
  const ps =
    hasPerm(permissionNames, "customer_supports.view", "customer_supports.manage") ||
    hasPerm(permissionNames, "withdraw_requests.view", "withdraw_requests.manage");

  const seriesDays = 14;
  const seriesStart = startOfDayUtc(addDaysUtc(now, -(seriesDays - 1)));

  const jobs = [];

  if (pu) {
    jobs.push(
      prisma.user.count(),
      prisma.user.count({ where: { userType: "driver" } }),
      countRange(prisma.user, {}, curStart, null),
      countRange(prisma.user, {}, prevStart, prevEnd),
      countRange(prisma.user, { userType: "driver" }, curStart, null),
      countRange(prisma.user, { userType: "driver" }, prevStart, prevEnd)
    );
  } else {
    jobs.push(
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null)
    );
  }

  if (pp) {
    jobs.push(
      prisma.product.count(),
      countRange(prisma.product, {}, curStart, null),
      countRange(prisma.product, {}, prevStart, prevEnd)
    );
  } else {
    jobs.push(Promise.resolve(null), Promise.resolve(null), Promise.resolve(null));
  }

  if (po) {
    jobs.push(
      prisma.productOrder.count(),
      prisma.productOrder.aggregate({ _sum: { total: true } }),
      countRange(prisma.productOrder, {}, curStart, null),
      countRange(prisma.productOrder, {}, prevStart, prevEnd),
      sumOrderTotalRange(curStart, null),
      sumOrderTotalRange(prevStart, prevEnd)
    );
  } else {
    jobs.push(
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null),
      Promise.resolve(null)
    );
  }

  if (pr) {
    jobs.push(
      prisma.rideRequestBid.count(),
      countRange(prisma.rideRequestBid, {}, curStart, null),
      countRange(prisma.rideRequestBid, {}, prevStart, prevEnd)
    );
  } else {
    jobs.push(Promise.resolve(null), Promise.resolve(null), Promise.resolve(null));
  }

  if (pc) {
    jobs.push(
      prisma.complaint.count(),
      countRange(prisma.complaint, {}, curStart, null),
      countRange(prisma.complaint, {}, prevStart, prevEnd)
    );
  } else {
    jobs.push(Promise.resolve(null), Promise.resolve(null), Promise.resolve(null));
  }

  let supportCountPromise = Promise.resolve(null);
  let supportCurPromise = Promise.resolve(null);
  let supportPrevPromise = Promise.resolve(null);
  if (ps) {
    supportCountPromise = Promise.all([
      prisma.customerSupport.count().catch(() => 0),
      prisma.withdrawRequest.count().catch(() => 0),
    ]).then(([a, b]) => a + b);
    supportCurPromise = Promise.all([
      countRange(prisma.customerSupport, {}, curStart, null),
      countRange(prisma.withdrawRequest, {}, curStart, null),
    ]).then(([a, b]) => a + b);
    supportPrevPromise = Promise.all([
      countRange(prisma.customerSupport, {}, prevStart, prevEnd),
      countRange(prisma.withdrawRequest, {}, prevStart, prevEnd),
    ]).then(([a, b]) => a + b);
  }
  jobs.push(supportCountPromise, supportCurPromise, supportPrevPromise);

  const resolved = await Promise.all(jobs);

  let i = 0;
  const usersTotal = resolved[i++];
  const driversTotal = resolved[i++];
  const usersCur = resolved[i++];
  const usersPrev = resolved[i++];
  const driversCur = resolved[i++];
  const driversPrev = resolved[i++];

  const productsTotal = resolved[i++];
  const productsCur = resolved[i++];
  const productsPrev = resolved[i++];

  const ordersTotal = resolved[i++];
  const revenueAgg = resolved[i++];
  const ordersCur = resolved[i++];
  const ordersPrev = resolved[i++];
  const revenueSumCur = resolved[i++];
  const revenueSumPrev = resolved[i++];

  const rideBidsTotal = resolved[i++];
  const rideCur = resolved[i++];
  const ridePrev = resolved[i++];

  const complaintsTotal = resolved[i++];
  const complaintsCur = resolved[i++];
  const complaintsPrev = resolved[i++];

  const supportTotal = resolved[i++];
  const supportCur = resolved[i++];
  const supportPrev = resolved[i++];

  const revenueTotal =
    revenueAgg && typeof revenueAgg._sum?.total === "number"
      ? revenueAgg._sum.total
      : revenueAgg?._sum?.total != null
        ? Number(revenueAgg._sum.total)
        : null;

  /** @type {Map<string, { orders: number, revenue: number, users: number }>} */
  const merged = new Map();

  if (po || pu) {
    const [orderRows, userRows] = await Promise.all([
      po
        ? prisma.$queryRaw`
            SELECT DATE(o.created_at) AS d,
                   COUNT(*) AS orderCount,
                   COALESCE(SUM(o.total), 0) AS revenue
            FROM Product_orders o
            WHERE o.created_at >= ${seriesStart}
            GROUP BY DATE(o.created_at)
            ORDER BY d ASC`
        : Promise.resolve([]),
      pu
        ? prisma.$queryRaw`
            SELECT DATE(u.created_at) AS d,
                   COUNT(*) AS userCount
            FROM users u
            WHERE u.created_at >= ${seriesStart}
            GROUP BY DATE(u.created_at)
            ORDER BY d ASC`
        : Promise.resolve([]),
    ]);

    for (const r of orderRows) {
      const key =
        r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
      const ocount = num(r.orderCount);
      const rev = num(r.revenue);
      merged.set(key, { orders: ocount, revenue: rev, users: 0 });
    }
    for (const r of userRows) {
      const key =
        r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
      const ucount = num(r.userCount);
      const existing = merged.get(key) || { orders: 0, revenue: 0, users: 0 };
      existing.users = ucount;
      merged.set(key, existing);
    }
  }

  let orderStatusPie = null;
  if (po) {
    const groups = await prisma.productOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    orderStatusPie = groups.map((g) => ({
      status: String(g.status),
      count: num(g._count._all),
    }));
  }

  const series = po || pu ? buildSeries(seriesStart, seriesDays, merged) : [];

  return {
    counts: {
      users: pu ? usersTotal : null,
      drivers: pd ? driversTotal : null,
      products: pp ? productsTotal : null,
      orders: po ? ordersTotal : null,
      revenueTotal: po ? revenueTotal : null,
      rideBids: pr ? rideBidsTotal : null,
      complaints: pc ? complaintsTotal : null,
      supportTickets: ps ? supportTotal : null,
    },
    trends: {
      users: pu ? pctChange(usersCur, usersPrev) : undefined,
      drivers: pd ? pctChange(driversCur, driversPrev) : undefined,
      products: pp ? pctChange(productsCur, productsPrev) : undefined,
      orders: po ? pctChange(ordersCur, ordersPrev) : undefined,
      revenue: po ? pctChange(revenueSumCur, revenueSumPrev) : undefined,
      rideBids: pr ? pctChange(rideCur, ridePrev) : undefined,
      complaints: pc ? pctChange(complaintsCur, complaintsPrev) : undefined,
      supportTickets: ps ? pctChange(supportCur, supportPrev) : undefined,
    },
    series,
    orderStatusPie,
  };
}
