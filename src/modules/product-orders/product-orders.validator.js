import { z } from "zod";
import { PRODUCT_ORDER_STATUSES } from "../../realtime/wsEvents.js";

const productOrderStatusEnum = z.enum(PRODUCT_ORDER_STATUSES);

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
      guestId: z.coerce.number().int().positive(),
      driverId: z.coerce.number().int().positive().optional().nullable(),
      status: productOrderStatusEnum.optional(),
      paymentMethod: z.enum(["CASH"]).optional(),
      dropoffLat: z.coerce.number().min(-90).max(90),
      dropoffLng: z.coerce.number().min(-180).max(180),
      dropoffNotes: z.string().optional().nullable(),
      dropoffNotesI18n: z.record(z.string()).optional().nullable(),
      commissionPct: z.coerce.number().nonnegative().optional().nullable(),
      currency: z.string().trim().min(1).optional().nullable(),
      items: z
        .array(
          z.object({
            variantId: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().positive(),
            unitPrice: z.coerce.number().nonnegative(),
          })
        )
        .optional(),
    })
    .passthrough(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      guestId: z.coerce.number().int().positive().optional(),
      driverId: z.coerce.number().int().positive().optional().nullable(),
      status: productOrderStatusEnum.optional(),
      paymentMethod: z.enum(["CASH"]).optional(),
      dropoffLat: z.coerce.number().min(-90).max(90).optional(),
      dropoffLng: z.coerce.number().min(-180).max(180).optional(),
      dropoffNotes: z.string().optional().nullable(),
      dropoffNotesI18n: z.record(z.string()).optional().nullable(),
      commissionPct: z.coerce.number().nonnegative().optional().nullable(),
      currency: z.string().trim().min(1).optional().nullable(),
    })
    .passthrough(),
});

export const statusSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    status: productOrderStatusEnum,
  }),
});

export const assignDriverSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    driverId: z.coerce.number().int().positive().nullable(),
  }),
});

export const acceptOfferSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    offerId: z.coerce.number().int().positive(),
  }),
});

export const invoiceQuerySchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z
    .object({
      lang: z.enum(["en", "ar"]).optional(),
    })
    .passthrough(),
});
