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
  body: z
    .object({
      userId: z.coerce.number().int().positive(),
      amount: z.coerce.number().nonnegative(),
      currency: z.string().trim().min(1).optional(),
      status: z.coerce.number().int().optional(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      userId: z.coerce.number().int().positive().optional(),
      amount: z.coerce.number().nonnegative().optional(),
      currency: z.string().trim().min(1).optional(),
      status: z.coerce.number().int().optional(),
    })
    .passthrough(),
});
