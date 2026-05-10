/**
 * One-off generator: creates src/modules/<route>/*.routes|controller|service|validator.js
 * Run: node scripts/generate-crud-modules.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const modulesDir = path.join(root, "src", "modules");

const MODULES = [
  { route: "customer-supports", prismaKey: "customerSupport", perm: "customer_supports.manage", search: [] },
  { route: "product-orders", prismaKey: "productOrder", perm: "orders.manage", search: [] },
  { route: "ride-request-bids", prismaKey: "rideRequestBid", perm: "ride_request_bids.manage", search: [] },
  { route: "users", prismaKey: "user", perm: "users.manage", search: ["email", "name"] },
  { route: "permissions", prismaKey: "permission", perm: "permissions.manage", search: ["name"] },
  { route: "roles", prismaKey: "role", perm: "roles.manage", search: ["name"] },
  { route: "role-permissions", prismaKey: "rolePermission", perm: "role_permissions.manage", search: [] },
  { route: "user-roles", prismaKey: "userRole", perm: "user_roles.manage", search: [] },
  { route: "wallets", prismaKey: "wallet", perm: "wallets.manage", search: [] },
  { route: "wallet-histories", prismaKey: "walletHistory", perm: "wallet_histories.manage", search: [] },
  { route: "reviews", prismaKey: "review", perm: "reviews.manage", search: [] },
  { route: "user-addresses", prismaKey: "userAddress", perm: "user_addresses.manage", search: ["title"] },
  { route: "user-bank-cards", prismaKey: "userBankCard", perm: "user_bank_cards.manage", search: [] },
  { route: "complaints", prismaKey: "complaint", perm: "complaints.manage", search: [] },
  { route: "documents", prismaKey: "document", perm: "documents.manage", search: ["name"] },
  { route: "driver-documents", prismaKey: "driverDocument", perm: "driver_documents.manage", search: [] },
  { route: "user-details", prismaKey: "userDetail", perm: "user_details.manage", search: [] },
  { route: "guest-customers", prismaKey: "guestCustomer", perm: "guest_customers.manage", search: ["name", "phone"] },
  { route: "product-order-items", prismaKey: "productOrderItem", perm: "product_order_items.manage", search: [] },
  { route: "driver-inventory-items", prismaKey: "driverInventoryItem", perm: "driver_inventory_items.manage", search: [] },
  { route: "product-order-offers", prismaKey: "productOrderOffer", perm: "product_order_offers.manage", search: [] },
  { route: "payments", prismaKey: "payment", perm: "payments.manage", search: [] },
  { route: "inventory-logs", prismaKey: "inventoryLog", perm: "inventory_logs.manage", search: ["reason"] },
  { route: "product-order-location-updates", prismaKey: "productOrderLocationUpdate", perm: "product_order_location_updates.manage", search: [] },
  { route: "categories", prismaKey: "category", perm: "categories.manage", search: ["name"] },
  { route: "products", prismaKey: "product", perm: "products.manage", search: ["name"] },
  { route: "product-types", prismaKey: "productType", perm: "product_types.manage", search: ["name"] },
  { route: "sizes", prismaKey: "size", perm: "sizes.manage", search: ["name"] },
  { route: "product-variants", prismaKey: "productVariant", perm: "product_variants.manage", search: [] },
  { route: "coupons", prismaKey: "coupon", perm: "coupons.manage", search: ["code"] },
  { route: "notifications", prismaKey: "notification", perm: "notifications.manage", search: ["type"] },
  { route: "push-notifications", prismaKey: "pushNotification", perm: "push_notifications.manage", search: [] },
  { route: "sos", prismaKey: "sos", perm: "sos.manage", search: ["name"] },
  { route: "security-audit-logs", prismaKey: "securityAuditLog", perm: "security_audit_logs.manage", search: ["category"] },
  { route: "booking-invoices", prismaKey: "bookingInvoice", perm: "booking_invoices.manage", search: [] },
  { route: "booking-location-updates", prismaKey: "bookingLocationUpdate", perm: "booking_location_updates.manage", search: [] },
  { route: "withdraw-requests", prismaKey: "withdrawRequest", perm: "withdraw_requests.manage", search: [] },
  { route: "support-chathistories", prismaKey: "supportChathistory", perm: "support_chathistories.manage", search: [] },
  { route: "pages", prismaKey: "pages", perm: "pages.manage", search: ["slug"] },
  { route: "admin-login-devices", prismaKey: "adminLoginDevice", perm: "admin_login_devices.manage", search: [] },
  { route: "admin-login-history", prismaKey: "adminLoginHistory", perm: "admin_login_history.manage", search: [] },
  { route: "ride-request-ratings", prismaKey: "rideRequestRating", perm: "ride_request_ratings.manage", search: [] },
  { route: "ride-request-histories", prismaKey: "rideRequestHistory", perm: "ride_request_histories.manage", search: [] },
];

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
}

for (const m of MODULES) {
  const servicePath = path.join(modulesDir, m.route, `${m.route}.service.js`);
  const controllerPath = path.join(modulesDir, m.route, `${m.route}.controller.js`);
  const validatorPath = path.join(modulesDir, m.route, `${m.route}.validator.js`);
  const routesPath = path.join(modulesDir, m.route, `${m.route}.routes.js`);

  const searchJson = JSON.stringify(m.search);

  const serviceContent = `import { createCrudService } from "../../core/crud/genericCrudService.js";

const svc = createCrudService("${m.prismaKey}", { searchableFields: ${searchJson} });

export const list = (q) => svc.list(q);
export const getById = (id) => svc.getById(id);
export const create = (data) => svc.create(data);
export const update = (id, data) => svc.update(id, data);
export const remove = (id) => svc.remove(id);
`;

  const controllerContent = `import * as service from "./${m.route}.service.js";
import { successResponse, paginatedResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

export async function list(req, res) {
  try {
    const { items, total, page, limit } = await service.list(req.query);
    const pages = Math.max(1, Math.ceil(total / limit));
    return paginatedResponse(res, items, { page, limit, total, pages }, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function getById(req, res) {
  try {
    const row = await service.getById(req.params.id);
    if (!row) return errorResponse(res, t("db.not_found", req.locale), 404);
    return successResponse(res, row, t("common.success", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function create(req, res) {
  try {
    const row = await service.create(req.body);
    return successResponse(res, row, t("common.created", req.locale), 201);
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function update(req, res) {
  try {
    const row = await service.update(req.params.id, req.body);
    return successResponse(res, row, t("common.updated", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}

export async function remove(req, res) {
  try {
    await service.remove(req.params.id);
    return successResponse(res, null, t("common.deleted", req.locale));
  } catch (e) {
    return errorResponse(res, e.message, 500);
  }
}
`;

  const validatorContent = `import { z } from "zod";

export const idParamSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
});

export const listQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      sort: z.string().optional(),
      q: z.string().optional(),
    })
    .passthrough(),
});

export const createSchema = z.object({
  body: z.any(),
});

export const updateSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.any(),
});
`;

  const routesContent = `import { Router } from "express";
import * as ctrl from "./${m.route}.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./${m.route}.validator.js";

const r = Router();
const PERM = "${m.perm}";

r.get("/", authenticate, validate(v.listQuerySchema), ctrl.list);
r.get("/:id", authenticate, validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
`;

  writeFile(servicePath, serviceContent);
  writeFile(controllerPath, controllerContent);
  writeFile(validatorPath, validatorContent);
  writeFile(routesPath, routesContent);
}

console.log("Generated", MODULES.length, "CRUD modules");
