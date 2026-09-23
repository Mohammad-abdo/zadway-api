import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as ctrl from "./platform-settings.controller.js";
import * as v from "./platform-settings.validator.js";

const r = Router();
const PERM = "admin.branding.manage";

r.get("/", authenticate, requirePermission([PERM]), ctrl.getSettings);
r.put(
  "/commission",
  authenticate,
  requirePermission([PERM]),
  validate(v.updateCommissionSchema),
  ctrl.updateCommission,
);

export default r;
