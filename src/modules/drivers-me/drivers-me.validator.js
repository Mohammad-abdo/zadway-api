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
