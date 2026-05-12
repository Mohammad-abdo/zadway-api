import { Router } from "express";
import authenticate from "../../core/middlewares/auth.middleware.js";
import requireDriver from "../../core/middlewares/requireDriver.middleware.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import * as ctrl from "./drivers-me.controller.js";
import * as v from "./drivers-me.validator.js";

const r = Router();

r.use(authenticate, requireDriver);

r.get("/me/inventory", ctrl.listInventory);
r.post("/me/inventory", validate(v.inventoryCreateSchema), ctrl.createInventory);
r.patch("/me/inventory/:id", validate(v.inventoryUpdateSchema), ctrl.updateInventory);
r.delete("/me/inventory/:id", validate(v.inventoryIdParamSchema), ctrl.removeInventory);
r.patch("/me/location", validate(v.driverLocationSchema), ctrl.patchLocation);
r.get("/me/product-orders", validate(v.driverOrdersListSchema), ctrl.listProductOrders);
r.get("/me/product-orders/:orderId", validate(v.driverOrderIdParamSchema), ctrl.getProductOrder);
r.post("/me/product-orders/:orderId/offers", validate(v.driverOfferSchema), ctrl.upsertOffer);
r.post("/me/product-orders/:orderId/claim", validate(v.claimOrderSchema), ctrl.claimProductOrder);

export default r;
