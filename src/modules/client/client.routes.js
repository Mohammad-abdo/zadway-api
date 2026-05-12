import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import optionalAuth from "../../core/middlewares/optionalAuth.middleware.js";
import requireRider from "../../core/middlewares/requireRider.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as ctrl from "./client.controller.js";
import * as v from "./client.validator.js";

const r = Router();

r.get("/catalog", ctrl.getCatalog);
r.get("/products/:productId/variants", validate(v.productIdParamSchema), ctrl.listVariants);
r.post("/guests", validate(v.clientGuestCreateSchema), ctrl.createGuest);
r.post("/orders", optionalAuth, validate(v.clientCreateOrderSchema), ctrl.createOrder);
r.get("/orders", authenticate, requireRider, validate(v.riderOrdersListSchema), ctrl.listMyOrders);
r.get("/orders/:id", optionalAuth, validate(v.orderIdParamSchema), ctrl.getOrder);

export default r;
