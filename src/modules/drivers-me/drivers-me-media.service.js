import fs from "fs/promises";
import path from "path";
import { allocateSequentialFilename } from "../../core/upload/allocateSequentialFile.js";
import { ensureUploadDirs } from "../../core/upload/mediaPaths.js";

const MIME_IMAGE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function extensionFor(file) {
  const fromMime = MIME_IMAGE[file.mimetype];
  if (fromMime) return fromMime;
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext && /^\.[a-z0-9]{2,8}$/i.test(ext)) return ext;
  return null;
}

/**
 * Store an image uploaded by an authenticated driver.
 * @param {{ buffer: Buffer; mimetype: string; originalname?: string }} file
 */
export async function storeDriverImage(file) {
  if (!file?.buffer?.length) {
    const e = new Error("no file");
    e.statusCode = 400;
    throw e;
  }
  const ext = extensionFor(file);
  if (!ext) {
    const e = new Error("invalid image type");
    e.statusCode = 415;
    throw e;
  }
  ensureUploadDirs();
  const { absolutePath, publicUrl, filename } = allocateSequentialFilename("image", ext);
  await fs.writeFile(absolutePath, file.buffer);
  return { url: publicUrl, path: publicUrl, filename };
}
