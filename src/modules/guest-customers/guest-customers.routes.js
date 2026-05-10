import { Router } from "express";
import * as ctrl from "./guest-customers.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./guest-customers.validator.js";

const r = Router();
const PERM = "guest_customers.manage";

r.post("/register", validate(v.createSchema), ctrl.create);
r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
