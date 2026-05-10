import fs from "fs/promises";
import path from "path";
import { allocateSequentialFilename } from "../../core/upload/allocateSequentialFile.js";
import { ensureUploadDirs } from "../../core/upload/mediaPaths.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

const MIME_IMAGE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const MIME_VIDEO = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

function extensionFor(kind, file) {
  const map = kind === "video" ? MIME_VIDEO : MIME_IMAGE;
  const fromMime = map[file.mimetype];
  if (fromMime) return fromMime;
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext && /^\.[a-z0-9]{2,8}$/i.test(ext)) return ext;
  return null;
}

export const uploadSingle =
  (kind) =>
  async (req, res) => {
    const locale = req.locale ?? "en";
    try {
      ensureUploadDirs();
      const file = req.file;
      if (!file?.buffer?.length) {
        return errorResponse(res, t("upload.no_file", locale), 400);
      }
      const ext = extensionFor(kind, file);
      if (!ext) {
        return errorResponse(res, t("upload.invalid_type", locale), 415);
      }
      const { absolutePath, publicUrl, filename } = allocateSequentialFilename(kind, ext);
      await fs.writeFile(absolutePath, file.buffer);
      return successResponse(
        res,
        { url: publicUrl, path: publicUrl, filename },
        t("upload.stored", locale),
        201,
      );
    } catch (e) {
      return errorResponse(res, e.message, 500);
    }
  };
