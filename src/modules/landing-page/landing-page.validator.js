import { z } from "zod";

export const updateSchema = z.object({
  body: z
    .object({
      config: z.record(z.string(), z.unknown()),
    })
    .strict(),
});
