import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import * as v from "./auth.validator.js";

const r = Router();

r.post("/login", validate(v.loginSchema), ctrl.login);
r.post("/register", validate(v.registerSchema), ctrl.register);
r.get("/me", authenticate, ctrl.me);

export default r;
