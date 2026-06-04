import { Router } from "express";
import * as ctrl from "./customer-supports.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./customer-supports.validator.js";

const r = Router();
const PERM = "customer_supports.manage";

// ── Self-service: any authenticated user ──────────────────────────────────
r.post("/me", authenticate, ctrl.createMine);
r.get("/me", authenticate, ctrl.listMine);
r.post("/me/:id/messages", authenticate, ctrl.addMessageMine);

// ── Admin-only ─────────────────────────────────────────────────────────────
r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.post(
  "/:id/messages",
  authenticate,
  requirePermission([PERM]),
  validate(v.supportMessageSchema),
  ctrl.addMessage,
);
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
