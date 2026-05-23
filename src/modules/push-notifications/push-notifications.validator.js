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

const audienceSchema = z.enum(["rider", "driver", "all", "riders", "drivers", "both"]).optional();

const adminPushBody = z.object({
  title: z.string().trim().min(1).optional(),
  message: z.string().optional(),
  titleI18n: z.record(z.string()).optional().nullable(),
  messageI18n: z.record(z.string()).optional().nullable(),
  audience: audienceSchema,
  forRider: z.boolean().optional(),
  forDriver: z.boolean().optional(),
});

export const createSchema = z.object({
  body: adminPushBody.refine(
    (b) =>
      (b.audience != null && String(b.audience).trim() !== "") ||
      b.forRider === true ||
      b.forDriver === true,
    { message: "audience is required (rider, driver, or all)" },
  ),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: adminPushBody,
});
