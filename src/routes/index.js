import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import uploadsRoutes from "../modules/uploads/uploads.routes.js";

import usersRoutes from "../modules/users/users.routes.js";
import permissionsRoutes from "../modules/permissions/permissions.routes.js";
import rolesRoutes from "../modules/roles/roles.routes.js";
import rolePermissionsRoutes from "../modules/role-permissions/role-permissions.routes.js";
import userRolesRoutes from "../modules/user-roles/user-roles.routes.js";
import walletsRoutes from "../modules/wallets/wallets.routes.js";
import walletHistoriesRoutes from "../modules/wallet-histories/wallet-histories.routes.js";
import reviewsRoutes from "../modules/reviews/reviews.routes.js";
import userAddressesRoutes from "../modules/user-addresses/user-addresses.routes.js";
import userBankCardsRoutes from "../modules/user-bank-cards/user-bank-cards.routes.js";
import complaintsRoutes from "../modules/complaints/complaints.routes.js";

import documentsRoutes from "../modules/documents/documents.routes.js";
import driverDocumentsRoutes from "../modules/driver-documents/driver-documents.routes.js";
import userDetailsRoutes from "../modules/user-details/user-details.routes.js";

import guestCustomersRoutes from "../modules/guest-customers/guest-customers.routes.js";
import productOrdersRoutes from "../modules/product-orders/product-orders.routes.js";
import productOrderItemsRoutes from "../modules/product-order-items/product-order-items.routes.js";
import driverInventoryItemsRoutes from "../modules/driver-inventory-items/driver-inventory-items.routes.js";
import productOrderOffersRoutes from "../modules/product-order-offers/product-order-offers.routes.js";
import paymentsRoutes from "../modules/payments/payments.routes.js";
import inventoryLogsRoutes from "../modules/inventory-logs/inventory-logs.routes.js";
import productOrderLocationUpdatesRoutes from "../modules/product-order-location-updates/product-order-location-updates.routes.js";

import categoriesRoutes from "../modules/categories/categories.routes.js";
import productsRoutes from "../modules/products/products.routes.js";
import productTypesRoutes from "../modules/product-types/product-types.routes.js";
import sizesRoutes from "../modules/sizes/sizes.routes.js";
import productVariantsRoutes from "../modules/product-variants/product-variants.routes.js";
import couponsRoutes from "../modules/coupons/coupons.routes.js";

import notificationsRoutes from "../modules/notifications/notifications.routes.js";
import pushNotificationsRoutes from "../modules/push-notifications/push-notifications.routes.js";

import sosRoutes from "../modules/sos/sos.routes.js";
import securityAuditLogsRoutes from "../modules/security-audit-logs/security-audit-logs.routes.js";

import bookingInvoicesRoutes from "../modules/booking-invoices/booking-invoices.routes.js";
import bookingLocationUpdatesRoutes from "../modules/booking-location-updates/booking-location-updates.routes.js";

import withdrawRequestsRoutes from "../modules/withdraw-requests/withdraw-requests.routes.js";

import customerSupportsRoutes from "../modules/customer-supports/customer-supports.routes.js";
import supportChathistoriesRoutes from "../modules/support-chathistories/support-chathistories.routes.js";
import pagesRoutes from "../modules/pages/pages.routes.js";
import bannersRoutes from "../modules/banners/banners.routes.js";

import adminLoginDevicesRoutes from "../modules/admin-login-devices/admin-login-devices.routes.js";
import adminLoginHistoryRoutes from "../modules/admin-login-history/admin-login-history.routes.js";

import rideRequestBidsRoutes from "../modules/ride-request-bids/ride-request-bids.routes.js";
import rideRequestRatingsRoutes from "../modules/ride-request-ratings/ride-request-ratings.routes.js";
import rideRequestHistoriesRoutes from "../modules/ride-request-histories/ride-request-histories.routes.js";

import * as adminBrandingCtrl from "../modules/admin-branding/admin-branding.controller.js";
import adminBrandingRoutes from "../modules/admin-branding/admin-branding.routes.js";
import adminDashboardRoutes from "../modules/admin-dashboard/admin-dashboard.routes.js";
import adminMetaRoutes from "../modules/admin-meta/admin-meta.routes.js";
import adminReportsRoutes from "../modules/admin-reports/admin-reports.routes.js";
import { validate } from "../core/middlewares/validate.middleware.js";
import * as authCtrl from "../modules/auth/auth.controller.js";
import * as authV from "../modules/auth/auth.validator.js";

const router = Router();

router.post("/register", validate(authV.publicRegisterSchema), authCtrl.publicRegister);
router.use("/auth", authRoutes);
router.get("/public/branding", adminBrandingCtrl.getPublic);
router.use("/admin/branding", adminBrandingRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/admin/meta", adminMetaRoutes);
router.use("/admin/reports", adminReportsRoutes);
router.use("/uploads", uploadsRoutes);

router.use("/users", usersRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/roles", rolesRoutes);
router.use("/role-permissions", rolePermissionsRoutes);
router.use("/user-roles", userRolesRoutes);
router.use("/wallets", walletsRoutes);
router.use("/wallet-histories", walletHistoriesRoutes);
router.use("/reviews", reviewsRoutes);
router.use("/user-addresses", userAddressesRoutes);
router.use("/user-bank-cards", userBankCardsRoutes);
router.use("/complaints", complaintsRoutes);

router.use("/documents", documentsRoutes);
router.use("/driver-documents", driverDocumentsRoutes);
router.use("/user-details", userDetailsRoutes);

router.use("/guest-customers", guestCustomersRoutes);
router.use("/product-orders", productOrdersRoutes);
router.use("/product-order-items", productOrderItemsRoutes);
router.use("/driver-inventory-items", driverInventoryItemsRoutes);
router.use("/product-order-offers", productOrderOffersRoutes);
router.use("/payments", paymentsRoutes);
router.use("/inventory-logs", inventoryLogsRoutes);
router.use("/product-order-location-updates", productOrderLocationUpdatesRoutes);

router.use("/categories", categoriesRoutes);
router.use("/products", productsRoutes);
router.use("/product-types", productTypesRoutes);
router.use("/sizes", sizesRoutes);
router.use("/product-variants", productVariantsRoutes);
router.use("/coupons", couponsRoutes);

router.use("/notifications", notificationsRoutes);
router.use("/push-notifications", pushNotificationsRoutes);

router.use("/sos", sosRoutes);
router.use("/security-audit-logs", securityAuditLogsRoutes);

router.use("/booking-invoices", bookingInvoicesRoutes);
router.use("/booking-location-updates", bookingLocationUpdatesRoutes);

router.use("/withdraw-requests", withdrawRequestsRoutes);

router.use("/customer-supports", customerSupportsRoutes);
router.use("/support-chathistories", supportChathistoriesRoutes);
router.use("/pages", pagesRoutes);
router.use("/banners", bannersRoutes);

router.use("/admin-login-devices", adminLoginDevicesRoutes);
router.use("/admin-login-history", adminLoginHistoryRoutes);

router.use("/ride-request-bids", rideRequestBidsRoutes);
router.use("/ride-request-ratings", rideRequestRatingsRoutes);
router.use("/ride-request-histories", rideRequestHistoriesRoutes);

export default router;
