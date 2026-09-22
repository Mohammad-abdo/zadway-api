import { z } from "zod";

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const listQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      sort: z.string().optional(),
      q: z.string().optional(),
    })
    .passthrough(),
});

export const createSchema = z.object({
  body: z.object({
    userId: z.coerce.number().int().positive(),
    balance: z.coerce.number().optional(),
    currency: z.string().trim().min(1).optional(),
  }),
});

// Deliberately excludes `balance`: balance changes must always go through
// POST /wallets/user/:userId/credit|debit so a WalletHistory ledger row is
// written alongside the update. A generic PATCH must never be able to move
// money silently.
export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    currency: z.string().trim().min(1).optional(),
  }),
});

export const userAmountSchema = z.object({
  params: z.object({ userId: z.coerce.number().int().positive() }),
  body: z.object({
    amount: z.coerce.number().positive(),
    description: z.string().optional(),
    transactionType: z.string().optional(),
    productOrderId: z.coerce.number().int().positive().optional(),
  }),
});
