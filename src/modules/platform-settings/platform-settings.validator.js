import { z } from "zod";

export const updateCommissionSchema = z.object({
  body: z
    .object({
      enabled: z
        .preprocess((v) => (typeof v === "string" ? ["1", "true", "on", "yes"].includes(v.toLowerCase()) : v), z.boolean())
        .optional(),
      commissionPct: z.coerce.number().min(0).max(100).optional(),
    })
    .refine((b) => b.enabled !== undefined || b.commissionPct !== undefined, {
      message: "enabled or commissionPct required",
    }),
});
