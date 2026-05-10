import fs from "fs";
import path from "path";

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
export const IMAGES_DIR = path.join(UPLOAD_ROOT, "images");
export const VIDEOS_DIR = path.join(UPLOAD_ROOT, "videos");
export const SEQUENCE_FILE = path.join(UPLOAD_ROOT, ".sequence.json");

export function ensureUploadDirs() {
  for (const dir of [UPLOAD_ROOT, IMAGES_DIR, VIDEOS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
