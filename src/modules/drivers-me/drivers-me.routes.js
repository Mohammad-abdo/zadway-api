import { Router } from "express";
import multer from "multer";
import authenticate from "../../core/middlewares/auth.middleware.js";
import requireDriver from "../../core/middlewares/requireDriver.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import { errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";
import * as ctrl from "./drivers-me.controller.js";
import * as v from "./drivers-me.validator.js";

const r = Router();

r.use(authenticate, requireDriver);

const memory = multer.memoryStorage();
const maxImageBytes = (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 12) * 1024 * 1024;
const uploadImage = multer({
  storage: memory,
  limits: { fileSize: maxImageBytes, files: 1 },
});

function wrapMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      const locale = req.locale ?? "en";
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return errorResponse(res, t("upload.file_too_large", locale), 413);
        }
        return errorResponse(res, err.message, 400);
      }
      if (err) return errorResponse(res, err.message, 400);
      next();
    });
  };
}

r.get("/me/inventory", ctrl.listInventory);
r.post("/me/inventory", validate(v.inventoryCreateSchema), ctrl.createInventory);
r.patch("/me/inventory/:id", validate(v.inventoryUpdateSchema), ctrl.updateInventory);
r.delete("/me/inventory/:id", validate(v.inventoryIdParamSchema), ctrl.removeInventory);
r.patch("/me/location", validate(v.driverLocationSchema), ctrl.patchLocation);
r.get("/me/product-orders", validate(v.driverOrdersListSchema), ctrl.listProductOrders);
r.get("/me/product-orders/:orderId", validate(v.driverOrderIdParamSchema), ctrl.getProductOrder);
r.post("/me/product-orders/:orderId/offers", validate(v.driverOfferSchema), ctrl.upsertOffer);
r.post("/me/product-orders/:orderId/claim", validate(v.claimOrderSchema), ctrl.claimProductOrder);
r.patch("/me/product-orders/:orderId/status", validate(v.driverOrderStatusSchema), ctrl.updateProductOrderStatus);

r.post("/me/media", wrapMulter(uploadImage.single("file")), ctrl.uploadMedia);

r.get("/me/categories", ctrl.listCategories);
r.post("/me/categories", validate(v.categoryCreateSchema), ctrl.createCategory);
r.patch("/me/categories/:id", validate(v.categoryUpdateSchema), ctrl.updateCategory);
r.delete("/me/categories/:id", validate(v.categoryIdParamSchema), ctrl.removeCategory);

r.get("/me/products", ctrl.listProducts);
r.get("/me/products/:id", validate(v.productIdParamSchema), ctrl.getProduct);
r.post("/me/products", validate(v.productCreateSchema), ctrl.createProduct);
r.patch("/me/products/:id", validate(v.productUpdateSchema), ctrl.updateProduct);
r.delete("/me/products/:id", validate(v.productIdParamSchema), ctrl.removeProduct);
r.post("/me/products/:id/variants", validate(v.productVariantCreateSchema), ctrl.addProductVariant);
r.patch(
  "/me/products/:id/variants/:variantId",
  validate(v.productVariantUpdateSchema),
  ctrl.updateProductVariant,
);
r.delete(
  "/me/products/:id/variants/:variantId",
  validate(v.productVariantDeleteSchema),
  ctrl.removeProductVariant,
);

r.get("/me/reports", ctrl.getReports);
r.get("/me/wallet", ctrl.getWallet);
r.get("/me/withdrawals", ctrl.listWithdrawals);
r.post("/me/withdrawals", validate(v.withdrawCreateSchema), ctrl.createWithdrawal);
r.get("/me/commissions", ctrl.getCommissions);

export default r;
