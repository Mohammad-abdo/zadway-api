import { Router } from "express";
import * as ctrl from "./products.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./products.validator.js";

const r = Router();
const PERM = "products.manage";

r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.get("/all", validate(v.listQuerySchema), ctrl.getProducts);
r.get("/category/:categoryId", validate(v.listQuerySchema), ctrl.getProductsByCategoryId);   
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.get("/mobile/:id",   validate(v.idParamSchema), ctrl.getProductById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
