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

const documentFields = {
  name: z.string().trim().min(1),
  nameAr: z.string().trim().optional().nullable(),
  nameI18n: z.record(z.string()).optional().nullable(),
  type: z.string().trim().optional().nullable(),
  status: z.coerce.number().int().optional(),
  isRequired: z.coerce.boolean().optional(),
  hasExpiryDate: z.coerce.boolean().optional(),
};

export const createSchema = z.object({
  body: z.object(documentFields),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object(documentFields).partial(),
});
