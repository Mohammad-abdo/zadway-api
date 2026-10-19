import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("withdrawRequest", { searchableFields: [] });

const include = { user: { select: { id: true, name: true, email: true, phone: true } } };

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: [], maxLimit: 500 });
  const where = { ...parsed.where };
  if (q?.userId != null && String(q.userId).trim() !== "") where.userId = Number(q.userId);
  if (q?.status != null && String(q.status).trim() !== "") where.status = Number(q.status);
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
    if (wr.status !== 0) {
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
    if (wallet.balance < wr.amount) {
      const e = new Error("insufficient wallet balance for this withdraw request");
      e.statusCode = 400;
      throw e;
    }

    const newBalance = wallet.balance - wr.amount;
    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
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

    return tx.withdrawRequest.update({
      where: { id: wrId },
      data: { status: 1 },
    });
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
    if (wr.status !== 0) {
      const e = new Error("withdraw request has already been processed");
      e.statusCode = 409;
      throw e;
    }
    return tx.withdrawRequest.update({
      where: { id: wrId },
      data: { status: 2 },
    });
  });
}
