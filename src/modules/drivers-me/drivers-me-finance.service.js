import prisma from "../../config/prisma.js";
import { getPlatformCommissionPct } from "../platform-settings/platform-settings.service.js";
import * as walletsService from "../wallets/wallets.service.js";

async function ensureWallet(userId, currency = "IQD") {
  const uid = Number(userId);
  let w = await prisma.wallet.findUnique({ where: { userId: uid } });
  if (!w) {
    w = await prisma.wallet.create({
      data: { userId: uid, balance: 0, currency },
    });
  }
  return w;
}

/**
 * Credit driver wallet with order net (subtotal - commission) once on DELIVERED.
 * Idempotent via WalletHistory.ProductOrderId lookup.
 */
export async function creditDriverForDeliveredOrder(order) {
  if (!order?.driverId || order.status !== "DELIVERED") return null;
  const existing = await prisma.walletHistory.findFirst({
    where: {
      ProductOrderId: Number(order.id),
      userId: Number(order.driverId),
      type: "credit",
      transactionType: "order_delivery",
    },
  });
  if (existing) return null;

  const net = Number(
    (Number(order.subtotal || 0) - Number(order.commissionAmt || 0)).toFixed(2),
  );
  if (net <= 0) return null;

  await ensureWallet(order.driverId, order.currency || "IQD");
  return walletsService.credit(order.driverId, net, {
    productOrderId: Number(order.id),
    description: `Delivery net for order #${order.id}`,
    transactionType: "order_delivery",
  });
}

export async function getMyWallet(driverId) {
  const wallet = await ensureWallet(driverId, "IQD");
  const histories = await prisma.walletHistory.findMany({
    where: { userId: Number(driverId) },
    orderBy: { id: "desc" },
    take: 40,
  });
  return { wallet, histories };
}

export async function listMyWithdrawals(driverId) {
  return prisma.withdrawRequest.findMany({
    where: { userId: Number(driverId) },
    orderBy: { id: "desc" },
    take: 50,
  });
}

export async function createMyWithdrawal(driverId, body) {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    const e = new Error("amount must be a positive number");
    e.statusCode = 400;
    throw e;
  }
  const wallet = await ensureWallet(driverId, body?.currency || "IQD");
  if (Number(wallet.balance) < amount) {
    const e = new Error("insufficient wallet balance");
    e.statusCode = 400;
    throw e;
  }
  const currency = body?.currency || wallet.currency || "IQD";

  return prisma.$transaction(async (tx) => {
    const w = await tx.wallet.findUnique({ where: { userId: Number(driverId) } });
    if (!w || w.balance < amount) {
      const e = new Error("insufficient wallet balance");
      e.statusCode = 400;
      throw e;
    }
    const newBal = Number((w.balance - amount).toFixed(2));
    await tx.wallet.update({ where: { id: w.id }, data: { balance: newBal } });
    await tx.walletHistory.create({
      data: {
        walletId: w.id,
        userId: Number(driverId),
        type: "debit",
        amount,
        balance: newBal,
        description: "Withdrawal request",
        transactionType: "withdraw_request",
      },
    });
    return tx.withdrawRequest.create({
      data: {
        userId: Number(driverId),
        amount,
        currency,
        status: 0,
      },
    });
  });
}

export async function getMyCommissions(driverId) {
  const platformCommissionPct = await getPlatformCommissionPct();
  const delivered = await prisma.productOrder.findMany({
    where: { driverId: Number(driverId), status: "DELIVERED" },
    select: {
      id: true,
      subtotal: true,
      commissionPct: true,
      commissionAmt: true,
      total: true,
      currency: true,
      deliveredAt: true,
      createdAt: true,
    },
    orderBy: { deliveredAt: "desc" },
    take: 100,
  });

  const gross = delivered.reduce((s, o) => s + Number(o.subtotal || 0), 0);
  const fees = delivered.reduce((s, o) => s + Number(o.commissionAmt || 0), 0);
  const net = gross - fees;

  return {
    platformCommissionPct,
    summary: {
      orders: delivered.length,
      gross: Number(gross.toFixed(2)),
      fees: Number(fees.toFixed(2)),
      net: Number(net.toFixed(2)),
    },
    orders: delivered.map((o) => ({
      id: o.id,
      subtotal: o.subtotal,
      commissionPct: o.commissionPct,
      commissionAmt: o.commissionAmt,
      net: Number((Number(o.subtotal) - Number(o.commissionAmt)).toFixed(2)),
      currency: o.currency,
      deliveredAt: o.deliveredAt,
    })),
  };
}
