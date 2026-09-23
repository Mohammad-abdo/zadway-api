import { z } from "zod";

export const updateCommissionSchema = z.object({
  body: z.object({
    commissionPct: z.coerce.number().min(0).max(100),
  }),
});
