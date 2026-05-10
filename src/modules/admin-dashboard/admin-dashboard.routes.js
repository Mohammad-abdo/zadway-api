import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import * as ctrl from "./admin-dashboard.controller.js";

const r = Router();

r.get("/stats", authenticate, requirePermission(["admin.dashboard.view"]), ctrl.getStats);

export default r;
