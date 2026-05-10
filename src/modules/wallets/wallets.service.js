import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";

const svc = createCrudService("wallet", { searchableFields: [] });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

/** Adjust wallet balance by userId (unique wallet per user). */
export async function adjustByUserId(userId, deltaAmount, opts = {}) {
  const uid = Number(userId);
  return prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId: uid } });
    if (!w) {
      const e = new Error("wallet not found");
      e.statusCode = 404;
      throw e;
    }
    const newBal = w.balance + deltaAmount;
    await tx.wallet.update({ where: { id: w.id }, data: { balance: newBal } });
    await tx.walletHistory.create({
      data: {
        walletId: w.id,
        userId: uid,
        ProductOrderId: opts.productOrderId ?? null,
        type: opts.type ?? (deltaAmount >= 0 ? "credit" : "debit"),
        amount: Math.abs(deltaAmount),
        balance: newBal,
        description: opts.description ?? null,
        transactionType: opts.transactionType ?? "adjustment",
      },
    });
    return tx.wallet.findUnique({ where: { id: w.id } });
  });
}

export const credit = (userId, amount, opts) => adjustByUserId(userId, Math.abs(amount), { ...opts, type: "credit" });
export const debit = (userId, amount, opts) => adjustByUserId(userId, -Math.abs(amount), { ...opts, type: "debit" });
