import { Router } from "express";
import * as ctrl from "./user-addresses.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./user-addresses.validator.js";

const r = Router();
const PERM = "user_addresses.manage";

// Self-service for the logged-in user (mobile) — register BEFORE /:id
r.get("/mine", authenticate, ctrl.listMine);
r.post("/mine", authenticate, validate(v.createSchema), ctrl.createMine);
r.patch("/mine/:id", authenticate, validate(v.updateSchema), ctrl.updateMine);
r.delete("/mine/:id", authenticate, validate(v.idParamSchema), ctrl.removeMine);
// Back-compat aliases
r.get("/me", authenticate, ctrl.listMine);
r.post("/me", authenticate, validate(v.createSchema), ctrl.createMine);
r.patch("/me/:id", authenticate, validate(v.updateSchema), ctrl.updateMine);
r.delete("/me/:id", authenticate, validate(v.idParamSchema), ctrl.removeMine);

r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
