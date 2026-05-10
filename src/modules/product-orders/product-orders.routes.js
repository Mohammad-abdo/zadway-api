import { Router } from "express";
import * as ctrl from "./product-orders.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./product-orders.validator.js";

const r = Router();
const PERM = "orders.manage";

r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.get(
  "/:id/invoice",
  authenticate,
  requireResourceAccess(PERM),
  validate(v.invoiceQuerySchema),
  ctrl.downloadInvoice,
);
r.patch(
  "/:id/status",
  authenticate,
  requirePermission([PERM]),
  validate(v.statusSchema),
  ctrl.patchStatus,
);
r.patch(
  "/:id/assign-driver",
  authenticate,
  requirePermission([PERM]),
  validate(v.assignDriverSchema),
  ctrl.assignDriver,
);
r.patch(
  "/:id/offers/:offerId/accept",
  authenticate,
  requirePermission([PERM]),
  validate(v.acceptOfferSchema),
  ctrl.acceptOffer,
);
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
