import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("wallet", { searchableFields: [] });

const listInclude = {
  user: { select: { id: true, name: true, email: true, phone: true, userType: true } },
  _count: { select: { histories: true } },
};

const hasValue = (v) => v != null && String(v).trim() !== "";

function buildListWhere(q = {}) {
  const where = {};
  if (hasValue(q.userId)) where.userId = Number(q.userId);

  const userWhere = {};
  if (hasValue(q.userType)) userWhere.userType = String(q.userType).trim();
  const term = typeof q.q === "string" ? q.q.trim() : "";
  if (term) {
    userWhere.OR = [{ name: { contains: term } }, { phone: { contains: term } }, { email: { contains: term } }];
  }
  if (Object.keys(userWhere).length) where.user = { is: userWhere };

  const balance = {};
  if (hasValue(q.minBalance) && Number.isFinite(Number(q.minBalance))) balance.gte = Number(q.minBalance);
  if (hasValue(q.maxBalance) && Number.isFinite(Number(q.maxBalance))) balance.lte = Number(q.maxBalance);
  const state = hasValue(q.balanceState) ? String(q.balanceState).trim() : "";
  if (state === "positive") balance.gt = 0;
  else if (state === "zero") balance.equals = 0;
  else if (state === "negative") balance.lt = 0;
  if (Object.keys(balance).length) where.balance = balance;

  return where;
}

export async function list(q = {}) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const where = buildListWhere(q);
  const [items, total] = await Promise.all([
    prisma.wallet.findMany({ where, skip: parsed.skip, take: parsed.take, orderBy: parsed.orderBy, include: listInclude }),
    prisma.wallet.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function stats() {
  const [agg, zeroCount, positiveCount, negativeCount, byTypeRows] = await Promise.all([
    prisma.wallet.aggregate({ _sum: { balance: true }, _avg: { balance: true }, _max: { balance: true }, _count: { _all: true } }),
    prisma.wallet.count({ where: { balance: 0 } }),
    prisma.wallet.count({ where: { balance: { gt: 0 } } }),
    prisma.wallet.count({ where: { balance: { lt: 0 } } }),
    prisma.$queryRaw`
      SELECT u.user_type AS userType, COUNT(w.id) AS count, COALESCE(SUM(w.balance), 0) AS total
      FROM wallets w LEFT JOIN users u ON u.id = w.user_id
      GROUP BY u.user_type
    `,
  ]);
  const byUserType = (byTypeRows || []).map((r) => ({
    userType: r.userType ?? null,
    count: Number(r.count || 0),
    total: Math.round(Number(r.total || 0) * 100) / 100,
  }));
  return {
    walletsCount: agg._count?._all ?? 0,
    totalBalance: Math.round(Number(agg._sum?.balance || 0) * 100) / 100,
    avgBalance: Math.round(Number(agg._avg?.balance || 0) * 100) / 100,
    maxBalance: Number(agg._max?.balance || 0),
    zeroCount,
    positiveCount,
    negativeCount,
    byUserType,
  };
}
export function getById(id) {
  return prisma.wallet.findUnique({
    where: { id: Number(id) },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, userType: true, createdAt: true } },
      _count: { select: { histories: true } },
    },
  });
}
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

/**
 * Adjust wallet balance by userId (unique wallet per user).
 *
 * Uses a raw conditional UPDATE instead of read-balance-then-write so the
 * check and the write happen as one atomic statement at the database level.
 * A plain `findUnique` + compute-in-JS + `update` has a lost-update race:
 * two concurrent debits can both read the same stale balance, both pass the
 * `>= 0` check against that stale value, and both commit, letting the
 * balance go negative / letting a driver withdraw more than they have.
 */
export async function adjustByUserId(userId, deltaAmount, opts = {}) {
  const uid = Number(userId);
  const delta = Number(deltaAmount);
  return prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId: uid } });
    if (!w) {
      const e = new Error("wallet not found");
      e.statusCode = 404;
      throw e;
    }
    const affected = await tx.$executeRaw`
      UPDATE wallets SET balance = ROUND(balance + ${delta}, 2)
      WHERE id = ${w.id} AND balance + ${delta} >= 0
    `;
    if (affected === 0) {
      const e = new Error("insufficient wallet balance");
      e.statusCode = 400;
      throw e;
    }
    const updated = await tx.wallet.findUnique({ where: { id: w.id } });
    await tx.walletHistory.create({
      data: {
        walletId: w.id,
        userId: uid,
        ProductOrderId: opts.productOrderId ?? null,
        type: opts.type ?? (delta >= 0 ? "credit" : "debit"),
        amount: Math.abs(delta),
        balance: updated.balance,
        description: opts.description ?? null,
        transactionType: opts.transactionType ?? "adjustment",
      },
    });
    return updated;
  });
}

export const credit = (userId, amount, opts) => adjustByUserId(userId, Math.abs(amount), { ...opts, type: "credit" });
export const debit = (userId, amount, opts) => adjustByUserId(userId, -Math.abs(amount), { ...opts, type: "debit" });
