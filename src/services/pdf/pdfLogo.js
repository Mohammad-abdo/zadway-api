import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { UPLOAD_ROOT } from "../../core/upload/mediaPaths.js";

/**
 * Load logo bytes for embedding in PDFs. Failures return null.
 * @param {string | null | undefined} logoUrl
 * @returns {Promise<Buffer | null>}
 */
export async function loadLogoBuffer(logoUrl) {
  if (!logoUrl || typeof logoUrl !== "string") return null;
  const u = logoUrl.trim();
  if (!u) return null;

  try {
    if (/^https?:\/\//i.test(u)) {
      const res = await axios.get(u, {
        responseType: "arraybuffer",
        timeout: 12_000,
        maxContentLength: 5 * 1024 * 1024,
        validateStatus: (s) => s >= 200 && s < 400,
      });
      return Buffer.from(res.data);
    }
    if (u.startsWith("/uploads/")) {
      const rel = u.replace(/^\/uploads\//, "").replace(/\\/g, "/");
      const abs = path.join(UPLOAD_ROOT, ...rel.split("/").filter(Boolean));
      return await fs.readFile(abs);
    }
  } catch {
    return null;
  }
  return null;
}
