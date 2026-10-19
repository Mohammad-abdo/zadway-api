import fs from "fs/promises";
import { allocateSequentialFilename } from "../../core/upload/allocateSequentialFile.js";
import { detectImageExtension, detectVideoExtension } from "../../core/upload/detectFileType.js";
import { ensureUploadDirs } from "../../core/upload/mediaPaths.js";
import { successResponse, errorResponse } from "../../core/utils/serverResponse.js";
import { t } from "../../core/i18n/index.js";

// The extension is derived from the file's actual magic bytes, never from
// the client-supplied mimetype/filename — see core/upload/detectFileType.js.
function extensionFor(kind, file) {
  return kind === "video" ? detectVideoExtension(file.buffer) : detectImageExtension(file.buffer);
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
