import multer from "multer";
import { errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";
import { DRIVER_DOCUMENT_TYPE_KEYS } from "./driver-onboarding.constants.js";

const maxImageBytes = (Number(process.env.UPLOAD_MAX_IMAGE_MB) || 12) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageBytes, files: DRIVER_DOCUMENT_TYPE_KEYS.length + 1 },
});

const fields = [...DRIVER_DOCUMENT_TYPE_KEYS, "car_image"].map((name) => ({ name, maxCount: 1 }));

/** Multipart parser for captain documents (one image per document type + optional `car_image`). */
export function driverDocumentsUpload(req, res, next) {
  upload.fields(fields)(req, res, (err) => {
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
}
