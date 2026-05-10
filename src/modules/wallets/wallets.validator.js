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
  body: z.object({}).passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({}).passthrough(),
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
