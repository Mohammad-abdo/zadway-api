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
      roleId: z.coerce.number().int().positive().optional(),
      role_id: z.coerce.number().int().positive().optional(),
    })
    .passthrough(),
});

export const createSchema = z.object({
  body: z.object({}).passthrough(),
});

export const syncSchema = z.object({
  body: z.object({
    roleId: z.coerce.number().int().positive(),
    permissionIds: z.array(z.coerce.number().int().positive()).default([]),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({}).passthrough(),
});
