/**
 * Pick localized string from Json i18n field { en, ar } or fallback.
 */
export function pickI18n(i18nField, locale = "en") {
  if (!i18nField || typeof i18nField !== "object") return null;
  const loc = locale === "ar" ? "ar" : "en";
  return i18nField[loc] ?? i18nField.en ?? i18nField.ar ?? null;
}
