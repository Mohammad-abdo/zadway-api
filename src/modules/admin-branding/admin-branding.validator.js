import { z } from "zod";

export const updateSchema = z.object({
  body: z
    .object({
      logoUrl: z.union([z.string(), z.null()]).optional(),
    })
    .strict(),
});
