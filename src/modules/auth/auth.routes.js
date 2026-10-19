import { Router } from "express";
import multer from "multer";
import * as ctrl from "./auth.controller.js";
import { validate } from "../../core/middlewares/validate.middleware.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { errorResponse } from "../../core/utils/serverResponse.js";
import * as v from "./auth.validator.js";
import * as onboardingCtrl from "../driver-onboarding/driver-onboarding.controller.js";
import { driverDocumentsUpload } from "../driver-onboarding/driver-onboarding.upload.js";

const r = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function wrapMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) return errorResponse(res, err.message, 400);
      next();
    });
  };
}

r.post("/login", validate(v.loginSchema), ctrl.login);
r.post("/register", validate(v.registerSchema), ctrl.register);
r.post("/driver/register", driverDocumentsUpload, onboardingCtrl.registerDriver);
r.get("/me", authenticate, ctrl.me);
r.patch("/me", authenticate, validate(v.updateMeSchema), ctrl.updateMe);
r.post("/me/password", authenticate, validate(v.changePasswordSchema), ctrl.changePassword);
r.post("/me/avatar", authenticate, wrapMulter(avatarUpload.single("file")), ctrl.uploadAvatar);

export default r;
