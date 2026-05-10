import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidi = bidiFactory();

const HAS_AR =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\ufb50-\ufdff\ufe70-\ufefc]/;

/**
 * Prepare Arabic (and mixed) text for LTR drawing engines (e.g. pdfkit).
 * @param {string} text
 */
export function prepareArabicLine(text) {
  if (!text) return "";
  const t = String(text);
  if (!HAS_AR.test(t)) return t;
  const shaped = arabicReshaper.convertArabic(t);
  const levels = bidi.getEmbeddingLevels(shaped, "rtl");
  return bidi.getReorderedString(shaped, levels);
}
