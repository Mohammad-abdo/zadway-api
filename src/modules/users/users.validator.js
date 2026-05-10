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

const hasLoginId = (data) => {
  return !!(data.body.email || data.body.phone);
};

export const registerSchema = z
  .object({
    body: z.object({
      email: z.string().email().optional(),
      phone: z.union([z.string(), z.number()]).optional(),
      password: z.string().min(6),
    }),
  })
  .refine(hasLoginId, {
    message: "email or phone required",
    path: ["body"],
  });
export const createSchema = z.object({
  body: z.object({}).passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({}).passthrough(),
});
