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

// Self-service registration may only ever create the two public app roles.
// Admin/staff accounts must be created through the admin-managed /users
// endpoint (requires users.manage), never through a public/unauthenticated route.
export const SELF_REGISTERABLE_USER_TYPES = ["rider", "driver"];

export const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      phone: z.union([z.string(), z.number()]).optional(),
      password: z.string().min(6),
      name: z.string().optional(),
      userType: z.enum(SELF_REGISTERABLE_USER_TYPES).optional(),
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
      role: z.enum(SELF_REGISTERABLE_USER_TYPES).optional(),
      avatar: z.string().optional(),
    })
    .refine((b) => Boolean(b.password || b.paddword), { message: "password required" }),
});

export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).optional(),
      displayName: z.string().min(1).optional(),
      avatar: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.union([z.string(), z.number()]).optional(),
    })
    .refine(
      (b) =>
        b.name !== undefined ||
        b.displayName !== undefined ||
        b.avatar !== undefined ||
        b.email !== undefined ||
        b.phone !== undefined,
      { message: "no fields to update" },
    ),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  }),
});
