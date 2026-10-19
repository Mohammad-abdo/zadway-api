import { Router } from "express";
import * as ctrl from "./landing-page.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./landing-page.validator.js";

const r = Router();

r.get("/", authenticate, requirePermission(["admin.branding.view", "admin.branding.manage"]), ctrl.getAdmin);
r.put("/", authenticate, requirePermission(["admin.branding.manage"]), validate(v.updateSchema), ctrl.update);

export default r;
