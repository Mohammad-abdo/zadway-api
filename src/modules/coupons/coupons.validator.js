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
      code: z.string().trim().min(1).optional().nullable(),
      title: z.string().optional().nullable(),
      titleAr: z.string().optional().nullable(),
      titleI18n: z.record(z.string()).optional().nullable(),
      couponType: z.string().optional().nullable(),
      usageLimitPerRider: z.coerce.number().int().nonnegative().optional().nullable(),
      discountType: z.string().optional().nullable(),
      discount: z.coerce.number().nonnegative().optional().nullable(),
      startDate: z.coerce.date().optional().nullable(),
      endDate: z.coerce.date().optional().nullable(),
      minimumAmount: z.coerce.number().nonnegative().optional().nullable(),
      maximumDiscount: z.coerce.number().nonnegative().optional().nullable(),
      status: z.coerce.number().int().optional().nullable(),
      description: z.string().optional().nullable(),
      descriptionAr: z.string().optional().nullable(),
      descriptionI18n: z.record(z.string()).optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      regionIds: z.string().optional().nullable(),
      serviceIds: z.any().optional().nullable(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      code: z.string().trim().min(1).optional().nullable(),
      title: z.string().optional().nullable(),
      titleAr: z.string().optional().nullable(),
      titleI18n: z.record(z.string()).optional().nullable(),
      couponType: z.string().optional().nullable(),
      usageLimitPerRider: z.coerce.number().int().nonnegative().optional().nullable(),
      discountType: z.string().optional().nullable(),
      discount: z.coerce.number().nonnegative().optional().nullable(),
      startDate: z.coerce.date().optional().nullable(),
      endDate: z.coerce.date().optional().nullable(),
      minimumAmount: z.coerce.number().nonnegative().optional().nullable(),
      maximumDiscount: z.coerce.number().nonnegative().optional().nullable(),
      status: z.coerce.number().int().optional().nullable(),
      description: z.string().optional().nullable(),
      descriptionAr: z.string().optional().nullable(),
      descriptionI18n: z.record(z.string()).optional().nullable(),
      imageUrl: z.string().optional().nullable(),
      regionIds: z.string().optional().nullable(),
      serviceIds: z.any().optional().nullable(),
    })
    .passthrough(),
});
