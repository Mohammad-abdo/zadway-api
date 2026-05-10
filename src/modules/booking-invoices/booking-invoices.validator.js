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
      bookingId: z.coerce.number().int().positive(),
      subtotal: z.coerce.number().nonnegative(),
      tax: z.coerce.number().nonnegative().optional(),
      discount: z.coerce.number().nonnegative().optional(),
      total: z.coerce.number().nonnegative(),
      issuedAt: z.coerce.date(),
      paidAt: z.coerce.date().optional().nullable(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      bookingId: z.coerce.number().int().positive().optional(),
      subtotal: z.coerce.number().nonnegative().optional(),
      tax: z.coerce.number().nonnegative().optional(),
      discount: z.coerce.number().nonnegative().optional(),
      total: z.coerce.number().nonnegative().optional(),
      issuedAt: z.coerce.date().optional(),
      paidAt: z.coerce.date().optional().nullable(),
    })
    .passthrough(),
});
