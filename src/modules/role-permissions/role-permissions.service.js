import prisma from "../../config/prisma.js";
import { parseListQuery } from "../../core/utils/pagination.js";
import { createCrudService } from "../../core/crud/genericCrudService.js";

const rolePermissionInclude = {
  role: { select: { id: true, name: true, guardName: true } },
  /** Permission model has no `description` column — only select existing fields. */
  permission: { select: { id: true, name: true, guardName: true } },
};

const svc = createCrudService("rolePermission", { searchableFields: [] });

/**
 * List role-permissions; when `query.roleId` (or `role_id`) is set, filter by that role.
 */
export async function list(query) {
  const parsed = parseListQuery(query, { searchableFields: [], maxLimit: 1000 });
  const roleIdRaw = query.roleId ?? query.role_id;
  const roleIdNum =
    roleIdRaw !== undefined && roleIdRaw !== "" && roleIdRaw !== null ? Number(roleIdRaw) : NaN;
  const roleFilter =
    Number.isInteger(roleIdNum) && roleIdNum > 0 ? { roleId: roleIdNum } : {};

  const where = { ...parsed.where, ...roleFilter };

  const [items, total] = await Promise.all([
    prisma.rolePermission.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: rolePermissionInclude,
    }),
    prisma.rolePermission.count({ where }),
  ]);
  return { items, total, page: parsed.page, limit: parsed.take };
}

export async function getById(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) return null;
  return prisma.rolePermission.findUnique({
    where: { id: numId },
    include: rolePermissionInclude,
  });
}
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);

/**
 * Replace all permissions for a role (idempotent). Empty permissionIds removes all links.
 */
export async function syncForRole(roleId, permissionIds) {
  const rid = Number(roleId);
  if (!Number.isInteger(rid) || rid < 1) {
    throw new Error("Invalid roleId");
  }

  const ids = [
    ...new Set(
      (permissionIds || [])
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0)
    ),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: rid } });
    if (ids.length > 0) {
      await tx.rolePermission.createMany({
        data: ids.map((permissionId) => ({ roleId: rid, permissionId })),
        skipDuplicates: true,
      });
    }
  });

  const assigned = await prisma.rolePermission.findMany({
    where: { roleId: rid },
    select: { id: true, permissionId: true },
  });
  return { roleId: rid, count: assigned.length, records: assigned };
}
