import { z } from "zod";
import { id } from "zod/v4/locales";

const hasLoginId = (b) =>
  Boolean(b.email?.trim()) ||
  b.phone !== undefined && b.phone !== null && String(b.phone).trim() !== "";

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      phone: z.union([z.string(), z.number()]).optional(),
      password: z.string().min(1),
    })
    .refine(hasLoginId, { message: "email or phone required" }),
});

export const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      phone: z.union([z.string(), z.number()]).optional(),
      password: z.string().min(6),
      name: z.string().optional(),
      userType: z.string().optional(),
    })
    .refine(hasLoginId, { message: "email or phone required" }),
});

export const publicRegisterSchema = z.object({
  body: z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.union([z.string(), z.number()]),
      password: z.string().min(6).optional(),
      paddword: z.string().min(6).optional(),
      role: z.string().optional(),
      avatar: z.string().optional(),
    })
    .refine((b) => Boolean(b.password || b.paddword), { message: "password required" }),
});
