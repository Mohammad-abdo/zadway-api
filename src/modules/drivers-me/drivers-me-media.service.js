import fs from "fs/promises";
import { allocateSequentialFilename } from "../../core/upload/allocateSequentialFile.js";
import { detectImageExtension } from "../../core/upload/detectFileType.js";
import { ensureUploadDirs } from "../../core/upload/mediaPaths.js";

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
  // The extension is derived from the file's actual magic bytes, never from
  // the client-supplied mimetype/filename — see detectFileType.js.
  const ext = detectImageExtension(file.buffer);
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
