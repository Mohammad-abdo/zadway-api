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

const bannerBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.union([z.string().max(8000), z.literal("")]).optional().nullable(),
  image: z.union([z.string().trim().max(2048), z.literal("")]).optional().nullable(),
  video: z.union([z.string().trim().max(2048), z.literal("")]).optional().nullable(),
  productId: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
  isActive: z.boolean().optional(),
});

export const createSchema = z.object({
  body: bannerBodySchema,
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: bannerBodySchema.partial(),
});
