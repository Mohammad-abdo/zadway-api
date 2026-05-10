import prisma from "../../config/prisma.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const svc = createCrudService("user", { searchableFields: ["email", "name"] });

function stripSensitive(user) {
  if (!user || typeof user !== "object") return user;
  const { password, otp, ...rest } = user;
  return rest;
}

/**
 * Admin UI uses `isActive` (checkbox); Prisma uses `status` string.
 * @param {Record<string, unknown>} raw
 */
export function normalizeUserWritePayload(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const data = { ...raw };
  if ("password" in data && (data.password === "" || data.password === null)) {
    delete data.password;
  }
  if ("isActive" in data) {
    const v = data.isActive;
    const active =
      v === true || v === 1 || String(v).toLowerCase() === "true" || String(v).toLowerCase() === "yes";
    data.status = active ? "active" : "inactive";
    delete data.isActive;
  }
  return data;
}

/**
 * @param {Record<string, unknown> | null | undefined} user
 */
export function shapeUserForAdmin(user) {
  if (!user || typeof user !== "object") return user;
  const status = String(user.status ?? "").toLowerCase();
  return {
    ...user,
    isActive: status === "active",
  };
}

export async function list(q) {
  const parsed = parseListQuery(q, { searchableFields: ["email", "name", "phone"] });
  const where = { ...parsed.where };
  if (q?.userType != null && String(q.userType).trim() !== "") {
    where.userType = String(q.userType);
  }
  if (q?.status != null && String(q.status).trim() !== "") {
    where.status = String(q.status);
  }
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: items.map((u) => shapeUserForAdmin(stripSensitive(u))),
    total,
    page: parsed.page,
    limit: parsed.limit,
  };
}

export async function getById(id) {
  const numId = Number(id);
  const row = await prisma.user.findUnique({
    where: { id: numId },
    include: {
      wallet: {
        include: {
          histories: { take: 40, orderBy: { createdAt: "desc" } },
        },
      },
      userRoles: {
        include: {
          role: { select: { id: true, name: true, guardName: true } },
        },
        orderBy: { id: "asc" },
      },
      detail: true,
      addresses: { take: 30, orderBy: { id: "desc" } },
      bankCards: { take: 20, orderBy: { id: "desc" } },
    },
  });
  return shapeUserForAdmin(stripSensitive(row));
}

export async function create(data) {
  const row = await svc.create(normalizeUserWritePayload(data));
  return shapeUserForAdmin(stripSensitive(row));
}

export async function update(id, data) {
  const row = await svc.update(id, normalizeUserWritePayload(data));
  return shapeUserForAdmin(stripSensitive(row));
}

export const remove = (id) => svc.remove(id);
