import { Router } from "express";
import * as ctrl from "./ride-request-bids.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as v from "./ride-request-bids.validator.js";

const r = Router();
const PERM = "ride_request_bids.manage";

r.get("/", authenticate, requireResourceAccess(PERM), validate(v.listQuerySchema), ctrl.list);
r.post(
  "/:id/accept",
  authenticate,
  requirePermission([PERM]),
  validate(v.idParamSchema),
  ctrl.acceptBid,
);
r.get("/:id", authenticate, requireResourceAccess(PERM), validate(v.idParamSchema), ctrl.getById);
r.post("/", authenticate, requirePermission([PERM]), validate(v.createSchema), ctrl.create);
r.patch("/:id", authenticate, requirePermission([PERM]), validate(v.updateSchema), ctrl.update);
r.delete("/:id", authenticate, requirePermission([PERM]), validate(v.idParamSchema), ctrl.remove);

export default r;
