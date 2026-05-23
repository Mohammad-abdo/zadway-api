import { z } from "zod";

const orderItemSchema = z.object({
  variantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const clientCreateOrderSchema = z.object({
  body: z.object({
    guestId: z.coerce.number().int().positive().optional(),
    guest: z
      .object({
        name: z.string().optional(),
        phone: z.union([z.string(), z.number()]).optional(),
      })
      .optional(),
    dropoffLat: z.coerce.number().min(-90).max(90),
    dropoffLng: z.coerce.number().min(-180).max(180),
    dropoffNotes: z.string().optional().nullable(),
    dropoffNotesI18n: z.record(z.string()).optional().nullable(),
    commissionPct: z.coerce.number().nonnegative().optional().nullable(),
    currency: z.string().trim().min(1).optional().nullable(),
    items: z.array(orderItemSchema).optional(),
    paymentMethod: z.enum(["CASH"]).optional(),
    /** Optional: pre-assign driver at creation (admin / dispatch). */
    driverId: z.coerce.number().int().positive().optional().nullable(),
  }),
});

export const clientGuestCreateSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.union([z.string(), z.number()]),
  }),
});

export const productIdParamSchema = z.object({
  params: z.object({ productId: z.coerce.number().int().positive() }),
});

export const orderIdParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const riderOrdersListSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      sort: z.string().optional(),
      q: z.string().optional(),
    })
    .passthrough(),
});
