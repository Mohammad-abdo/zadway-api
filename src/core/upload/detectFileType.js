/**
 * Detect the real file type from its magic bytes — never trust the
 * client-supplied `mimetype` or filename extension alone. Both are fully
 * attacker-controlled (a browser/HTTP client can set either field to
 * anything), so relying on them to decide what gets written under
 * `/uploads/...` and served back by `express.static` lets an attacker store
 * an arbitrary file (e.g. an `.svg`/`.html` payload claiming to be a PNG)
 * and have it served back as that content type — stored XSS.
 */

/**
 * @param {Buffer} buffer
 * @returns {".jpg"|".png"|".gif"|".webp"|null}
 */
export function detectImageExtension(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return ".png";
  }
  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return ".gif";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return ".webp";
  }
  return null;
}

/**
 * @param {Buffer} buffer
 * @returns {".mp4"|".mov"|".webm"|null}
 */
export function detectVideoExtension(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // ISO base media file format (MP4/MOV): 4-byte box size, then "ftyp".
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    return brand.startsWith("qt") ? ".mov" : ".mp4";
  }
  // WebM / Matroska EBML header.
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return ".webm";
  }
  return null;
}
