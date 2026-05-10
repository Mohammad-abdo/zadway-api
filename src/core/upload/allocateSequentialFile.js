import fs from "fs";
import path from "path";
import {
  SEQUENCE_FILE,
  ensureUploadDirs,
  IMAGES_DIR,
  VIDEOS_DIR,
} from "./mediaPaths.js";

/**
 * Next ordered filename: 00000001.ext, 00000002.ext (per kind).
 * Counter persisted in uploads/.sequence.json (use persistent disk in production).
 */
export function allocateSequentialFilename(kind, extWithDot) {
  ensureUploadDirs();
  const key = kind === "video" ? "video" : "image";
  let seqData = { image: 0, video: 0 };
  if (fs.existsSync(SEQUENCE_FILE)) {
    try {
      seqData = { ...seqData, ...JSON.parse(fs.readFileSync(SEQUENCE_FILE, "utf8")) };
    } catch {
      /* ignore bad JSON */
    }
  }
  seqData[key] = (Number(seqData[key]) || 0) + 1;
  fs.writeFileSync(SEQUENCE_FILE, JSON.stringify(seqData, null, 2), "utf8");

  const dot = extWithDot.startsWith(".") ? extWithDot : `.${extWithDot}`;
  const filename = `${String(seqData[key]).padStart(8, "0")}${dot}`;
  const subdir = key === "video" ? "videos" : "images";
  const absolutePath = path.join(key === "video" ? VIDEOS_DIR : IMAGES_DIR, filename);

  return {
    seq: seqData[key],
    filename,
    subdir,
    publicUrl: `/uploads/${subdir}/${filename}`,
    absolutePath,
  };
}
