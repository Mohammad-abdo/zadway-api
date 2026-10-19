import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import * as ctrl from "./driver-onboarding.controller.js";

const PERM = ["users.manage", "driver_documents.manage"];

/** Mounted at `/admin/drivers`. */
const adminRouter = Router();
adminRouter.use(authenticate, requirePermission(PERM));
adminRouter.get("/review", ctrl.listForReview);
adminRouter.get("/review/pending-count", ctrl.pendingCount);
adminRouter.get("/:id/review", ctrl.getReview);
adminRouter.post("/:id/approve", ctrl.approve);
adminRouter.post("/:id/reject", ctrl.reject);
adminRouter.patch("/:id/documents/:documentId", ctrl.reviewDocument);

export { adminRouter };
