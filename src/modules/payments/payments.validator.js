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
      status: z.string().optional(),
      method: z.string().optional(),
      orderId: z.coerce.number().int().positive().optional(),
      userId: z.coerce.number().int().positive().optional(),
      driverId: z.coerce.number().int().positive().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .passthrough(),
});

export const statsQuerySchema = z.object({
  query: z
    .object({
      days: z.coerce.number().int().min(1).max(90).optional(),
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
