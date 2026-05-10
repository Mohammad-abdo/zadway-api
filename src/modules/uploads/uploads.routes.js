import { Router } from "express";
import multer from "multer";
import * as ctrl from "./uploads.controller.js";
import authenticate from "../../core/middlewares/auth.middleware.js";
import { requirePermission } from "../../core/middlewares/authorize.middleware.js";
import { errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

const r = Router();

const memory = multer.memoryStorage();
const maxImageBytes = (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 12) * 1024 * 1024;
const maxVideoBytes = (Number(process.env.UPLOAD_MAX_VIDEO_MB) || 200) * 1024 * 1024;

const uploadImage = multer({
  storage: memory,
  limits: { fileSize: maxImageBytes, files: 1 },
});

const uploadVideo = multer({
  storage: memory,
  limits: { fileSize: maxVideoBytes, files: 1 },
});

function wrapMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      const locale = req.locale ?? "en";
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return errorResponse(res, t("upload.file_too_large", locale), 413);
        }
        return errorResponse(res, err.message, 400);
      }
      if (err) return errorResponse(res, err.message, 400);
      next();
    });
  };
}

const requireUploadManage = requirePermission(["media.upload.manage"]);

r.post("/image", authenticate, requireUploadManage, wrapMulter(uploadImage.single("file")), ctrl.uploadSingle("image"));
r.post("/video", authenticate, requireUploadManage, wrapMulter(uploadVideo.single("file")), ctrl.uploadSingle("video"));

export default r;
