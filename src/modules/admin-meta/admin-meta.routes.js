import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import * as ctrl from "./admin-meta.controller.js";

const r = Router();

// Any dashboard user can read meta (used for admin UI behavior).
r.get("/", authenticate, requirePermission(["admin.dashboard.view"]), ctrl.getMeta);

export default r;

