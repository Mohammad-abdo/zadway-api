import prisma from "../../config/prisma.js";

/**
 * Flat permission names for RBAC (dashboard staff). All access is role-based.
 * Optional wildcard permission name `*` grants everything when assigned to a role.
 * @param {number} userId
 * @param {string | null | undefined} userType
 * @returns {Promise<{ permissionNames: string[]; isDashboardAdmin: boolean }>}
 */
export async function getDashboardPermissionPayload(userId, userType) {
  void userType;

  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const names = new Set();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      if (rp.permission?.name) names.add(rp.permission.name);
    }
  }

  const permissionNames = Array.from(names);
  const isDashboardAdmin = names.has("*");

  return {
    permissionNames,
    isDashboardAdmin,
  };
}

/**
 * True if the user holds the permission, a matching `*.manage` when checking `*.view`,
 * or holds wildcard `*`.
 */
export async function userHasAnyPermission(userId, userType, permissionNames) {
  const payload = await getDashboardPermissionPayload(userId, userType);
  if (!permissionNames?.length) return true;
  if (payload.isDashboardAdmin) return true;

  const set = new Set(payload.permissionNames);
  if (set.has("*")) return true;

  return permissionNames.some((n) => {
    if (!n) return false;
    if (set.has(n)) return true;
    if (typeof n === "string" && n.endsWith(".view")) {
      const manage = n.replace(/\.view$/, ".manage");
      if (set.has(manage)) return true;
    }
    return false;
  });
}

