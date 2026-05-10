import { Router } from "express";
import * as ctrl from "./admin-branding.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./admin-branding.validator.js";

const r = Router();
const PERM = "admin.branding.manage";

r.put("/", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);

export default r;
