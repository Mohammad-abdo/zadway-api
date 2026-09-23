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

export const driverOrderStatusSchema = z.object({
  params: z.object({ orderId: z.coerce.number().int().positive() }),
  body: z.object({
    status: z.enum(["PICKED_UP", "ON_THE_WAY", "DELIVERED"]),
  }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const categoryCreateSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(255),
      nameAr: z.string().trim().max(255).optional().nullable(),
      description: z.string().max(8000).optional().nullable(),
      descriptionAr: z.string().max(8000).optional().nullable(),
      imageUrl: z.string().max(2048).optional().nullable(),
      image_url: z.string().max(2048).optional().nullable(),
      parentId: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
    })
    .passthrough(),
});

export const categoryUpdateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      name: z.string().trim().min(1).max(255).optional(),
      nameAr: z.string().trim().max(255).optional().nullable(),
      description: z.string().max(8000).optional().nullable(),
      descriptionAr: z.string().max(8000).optional().nullable(),
      imageUrl: z.string().max(2048).optional().nullable(),
      image_url: z.string().max(2048).optional().nullable(),
      parentId: z.union([z.coerce.number().int().positive(), z.literal(""), z.null()]).optional(),
    })
    .passthrough(),
});

export const productIdParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

const variantInputSchema = z
  .object({
    sizeId: z.coerce.number().int().positive().optional(),
    typeId: z.coerce.number().int().positive().optional(),
    sizeName: z.string().trim().max(120).optional(),
    typeName: z.string().trim().max(120).optional(),
    size: z.string().trim().max(120).optional(),
    type: z.string().trim().max(120).optional(),
    price: z.coerce.number().nonnegative(),
    quantityOnHand: z.coerce.number().int().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    currency: z.string().trim().min(1).max(8).optional(),
    sku: z.string().trim().max(64).optional().nullable(),
    imageUrl: z.string().max(2048).optional().nullable(),
  })
  .passthrough();

export const productCreateSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(255),
      nameAr: z.string().trim().max(255).optional().nullable(),
      description: z.string().max(8000).optional().nullable(),
      descriptionAr: z.string().max(8000).optional().nullable(),
      categoryId: z.coerce.number().int().positive(),
      imageUrl: z.string().trim().min(1).max(2048),
      images: z.array(z.string()).optional().nullable(),
      isActive: z.boolean().optional(),
      variants: z.array(variantInputSchema).min(1),
    })
    .passthrough(),
});

export const productUpdateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z
    .object({
      name: z.string().trim().min(1).max(255).optional(),
      nameAr: z.string().trim().max(255).optional().nullable(),
      description: z.string().max(8000).optional().nullable(),
      descriptionAr: z.string().max(8000).optional().nullable(),
      categoryId: z.coerce.number().int().positive().optional(),
      imageUrl: z.string().trim().min(1).max(2048).optional(),
      images: z.array(z.string()).optional().nullable(),
      isActive: z.boolean().optional(),
    })
    .passthrough(),
});

export const productVariantCreateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: variantInputSchema,
});

export const productVariantUpdateSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
    variantId: z.coerce.number().int().positive(),
  }),
  body: variantInputSchema.partial().extend({
    price: z.coerce.number().nonnegative().optional(),
  }),
});
