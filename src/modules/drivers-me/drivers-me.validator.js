import { z } from "zod";

export const inventoryIdParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const inventoryCreateSchema = z.object({
  body: z
    .object({
      variantId: z.coerce.number().int().positive(),
      quantityOnHand: z.coerce.number().int().nonnegative().optional(),
      price: z.coerce.number().nonnegative(),
      currency: z.string().trim().min(1).optional(),
    })
    .passthrough(),
});

export const inventoryUpdateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      quantityOnHand: z.coerce.number().int().nonnegative().optional(),
      price: z.coerce.number().nonnegative().optional(),
      currency: z.string().trim().min(1).optional(),
    })
    .passthrough(),
});

export const claimOrderSchema = z.object({
  params: z.object({ orderId: z.coerce.number().int().positive() }),
});

export const driverLocationSchema = z.object({
  body: z.object({
    latitude: z.union([z.string(), z.number()]),
    longitude: z.union([z.string(), z.number()]),
    currentHeading: z.coerce.number().optional(),
  }),
});

export const driverOrdersListSchema = z.object({
  query: z
    .object({
      filter: z.enum(["mine", "open"]).optional(),
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      sort: z.string().optional(),
    })
    .passthrough(),
});

export const driverOrderIdParamSchema = z.object({
  params: z.object({ orderId: z.coerce.number().int().positive() }),
});

export const driverOfferSchema = z.object({
  params: z.object({ orderId: z.coerce.number().int().positive() }),
  body: z.object({
    offeredPrice: z.coerce.number().nonnegative().optional().nullable(),
  }),
});
