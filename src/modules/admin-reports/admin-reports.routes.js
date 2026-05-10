import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import * as ctrl from "./admin-reports.controller.js";

const r = Router();

r.get("/range", authenticate, requirePermission(["admin.dashboard.view"]), ctrl.getRange);
r.get("/range.pdf", authenticate, requirePermission(["admin.dashboard.view"]), ctrl.getRangePdf);
r.get("/range.xlsx", authenticate, requirePermission(["admin.dashboard.view"]), ctrl.getRangeXlsx);

export default r;
