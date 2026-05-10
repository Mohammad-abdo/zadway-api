/**
 * @param {unknown} queryLang
 * @param {string | string[] | undefined} acceptLanguage
 * @returns {"en" | "ar"}
 */
export function resolvePdfLang(queryLang, acceptLanguage) {
  const q = String(queryLang || "")
    .trim()
    .toLowerCase();
  if (q === "ar") return "ar";
  if (q === "en") return "en";

  const al = Array.isArray(acceptLanguage) ? acceptLanguage.join(",") : String(acceptLanguage || "");
  if (/^ar\b/i.test(al) || /,\s*ar\b/i.test(al)) return "ar";

  return "en";
}
