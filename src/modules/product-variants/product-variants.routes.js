import { Router } from "express";
import * as ctrl from "./product-variants.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./product-variants.validator.js";

const r = Router();
const PERM = "product_variants.manage";

r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
