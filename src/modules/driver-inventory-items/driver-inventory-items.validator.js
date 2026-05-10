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
      driverId: z.coerce.number().int().positive(),
      variantId: z.coerce.number().int().positive(),
      quantityOnHand: z.coerce.number().int().nonnegative().optional(),
      price: z.coerce.number().nonnegative(),
      currency: z.string().trim().min(1).optional(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      driverId: z.coerce.number().int().positive().optional(),
      variantId: z.coerce.number().int().positive().optional(),
      quantityOnHand: z.coerce.number().int().nonnegative().optional(),
      price: z.coerce.number().nonnegative().optional(),
      currency: z.string().trim().min(1).optional(),
    })
    .passthrough(),
});
