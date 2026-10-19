import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("withdrawRequest", { searchableFields: [] });

const include = { user: { select: { id: true, name: true, email: true, phone: true, userType: true } } };

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.userId != null && String(q.userId).trim() !== "") where.userId = Number(q.userId);
  if (q?.status != null && String(q.status).trim() !== "") where.status = Number(q.status);
  const term = typeof q?.q === "string" ? q.q.trim() : "";
  if (term) {
    const or = [{ user: { is: { name: { contains: term } } } }, { user: { is: { phone: { contains: term } } } }, { user: { is: { email: { contains: term } } } }];
    if (/^\d+$/.test(term)) or.push({ id: Number(term) });
    where.OR = or;
  }
  const [items, total] = await Promise.all([
    prisma.withdrawRequest.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include,
    }),
    prisma.withdrawRequest.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.limit };
}

export async function stats() {
  const rows = await prisma.withdrawRequest.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } });
  const out = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    total: { count: 0, amount: 0 },
  };
  const keys = { 0: "pending", 1: "approved", 2: "rejected" };
  for (const r of rows) {
    const count = r._count?._all ?? 0;
    const amount = Number(r._sum?.amount || 0);
    const key = keys[r.status];
    if (key) {
      out[key].count += count;
      out[key].amount += amount;
    }
    out.total.count += count;
    out.total.amount += amount;
  }
  for (const k of Object.keys(out)) out[k].amount = Math.round(out[k].amount * 100) / 100;
  return out;
}

export async function getById(id) {
  return prisma.withdrawRequest.findUnique({
    where: { id: Number(id) },
    include,
  });
}
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

/** status codes: 0 pending, 1 approved, 2 rejected (convention) */
export async function approve(id) {
  const wrId = Number(id);
  return prisma.$transaction(async (tx) => {
    const wr = await tx.withdrawRequest.findUnique({ where: { id: wrId } });
    if (!wr) {
      const e = new Error("withdraw request not found");
      e.statusCode = 404;
      throw e;
    }
    const claimed = await tx.withdrawRequest.updateMany({ where: { id: wrId, status: 0 }, data: { status: 1 } });
    if (claimed.count !== 1) {
      const e = new Error("withdraw request has already been processed");
      e.statusCode = 409;
      throw e;
    }

    const wallet = await tx.wallet.findUnique({ where: { userId: wr.userId } });
    if (!wallet) {
      const e = new Error("wallet not found");
      e.statusCode = 404;
      throw e;
    }
    const debited = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: wr.amount } },
      data: { balance: { decrement: wr.amount } },
    });
    if (debited.count !== 1) {
      const e = new Error("insufficient wallet balance for this withdraw request");
      e.statusCode = 400;
      throw e;
    }

    const { balance: newBalance } = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
    await tx.walletHistory.create({
      data: {
        walletId: wallet.id,
        userId: wr.userId,
        type: "debit",
        amount: wr.amount,
        balance: newBalance,
        description: `Withdraw request #${wr.id} approved`,
        transactionType: "withdraw",
      },
    });

    return tx.withdrawRequest.findUnique({ where: { id: wrId } });
  });
}

export async function reject(id) {
  const wrId = Number(id);
  return prisma.$transaction(async (tx) => {
    const wr = await tx.withdrawRequest.findUnique({ where: { id: wrId } });
    if (!wr) {
      const e = new Error("withdraw request not found");
      e.statusCode = 404;
      throw e;
    }
    const claimed = await tx.withdrawRequest.updateMany({ where: { id: wrId, status: 0 }, data: { status: 2 } });
    if (claimed.count !== 1) {
      const e = new Error("withdraw request has already been processed");
      e.statusCode = 409;
      throw e;
    }
    return tx.withdrawRequest.findUnique({ where: { id: wrId } });
  });
}
