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
      message: z.string().optional().nullable(),
      messageI18n: z.record(z.string()).optional().nullable(),
      supportType: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
      resolutionDetail: z.string().optional().nullable(),
      resolutionDetailI18n: z.record(z.string()).optional().nullable(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      userId: z.coerce.number().int().positive().optional(),
      message: z.string().optional().nullable(),
      messageI18n: z.record(z.string()).optional().nullable(),
      supportType: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
      resolutionDetail: z.string().optional().nullable(),
      resolutionDetailI18n: z.record(z.string()).optional().nullable(),
    })
    .passthrough(),
});

export const supportMessageSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    message: z.string().optional(),
    senderType: z.string().optional(),
  }),
});
