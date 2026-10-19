import crypto from "crypto";
import path from "path";
import { ensureUploadDirs, IMAGES_DIR, VIDEOS_DIR } from "./mediaPaths.js";

/**
 * Collision-proof filename: `<base36 timestamp><6 random hex chars>.ext`.
 *
 * Previously this used a shared `.sequence.json` counter file that was
 * read, incremented, and written with plain sync fs calls. That's safe
 * within a single Node process (synchronous code can't be interleaved by
 * another request), but this API is designed to run under PM2 cluster mode
 * (see the comment in config/prisma.js) — across separate OS processes,
 * that read-modify-write has no atomicity at all, so two uploads landing in
 * different workers at nearly the same time could compute the same next
 * number and one would silently overwrite the other's file. A random,
 * collision-proof name needs no shared state or locking, so it's immune to
 * that regardless of how many processes are serving requests.
 */
export function allocateSequentialFilename(kind, extWithDot) {
  ensureUploadDirs();
  const key = kind === "video" ? "video" : "image";

  const filename = `${Date.now().toString(36)}${crypto.randomBytes(6).toString("hex")}${
    extWithDot.startsWith(".") ? extWithDot : `.${extWithDot}`
  }`;
  const subdir = key === "video" ? "videos" : "images";
  const absolutePath = path.join(key === "video" ? VIDEOS_DIR : IMAGES_DIR, filename);

  return {
    filename,
    subdir,
    publicUrl: `/uploads/${subdir}/${filename}`,
    absolutePath,
  };
}
