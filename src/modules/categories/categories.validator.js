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
      name: z.string().trim().min(1),
      nameI18n: z.record(z.string()).optional().nullable(),
      description: z.string().optional().nullable(),
      descriptionI18n: z.record(z.string()).optional().nullable(),
      image_url: z.string().optional().nullable(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      name: z.string().trim().min(1).optional(),
      nameI18n: z.record(z.string()).optional().nullable(),
      description: z.string().optional().nullable(),
      descriptionI18n: z.record(z.string()).optional().nullable(),
      image_url: z.string().optional().nullable(),
    })
    .passthrough(),
});
