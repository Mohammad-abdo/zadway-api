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

const adminNotificationFields = z.object({
  userId: z.coerce.number().int().positive().optional(),
  notifiableId: z.coerce.number().int().positive().optional(),
  notifiableType: z.string().optional(),
  type: z.string().trim().min(1).optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  isRead: z.boolean().optional(),
});

const adminNotificationCreateBody = adminNotificationFields.refine(
  (b) => b.userId != null || b.notifiableId != null,
  { message: "userId is required" },
);

export const createSchema = z.object({
  body: adminNotificationCreateBody,
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: adminNotificationFields.partial(),
});
