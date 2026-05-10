import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(readFileSync(path.join(__dirname, "../../i18n/en.json"), "utf8"));
const ar = JSON.parse(readFileSync(path.join(__dirname, "../../i18n/ar.json"), "utf8"));

const dictionaries = { en, ar };

export function detectLocale(req) {
  const q = req?.query?.lang ?? req?.query?.locale;
  if (q === "ar" || q === "en") return q;
  const hdr = req?.headers?.["x-lang"] ?? req?.headers?.["x-locale"];
  if (typeof hdr === "string" && hdr.toLowerCase() === "ar") return "ar";
  const header = req?.headers?.["accept-language"];
  if (typeof header === "string" && header.toLowerCase().includes("ar")) return "ar";
  return "en";
}

export function t(key, locale = "en", vars = undefined) {
  const dict = dictionaries[locale] ?? dictionaries.en;
  let value = dict[key] ?? dictionaries.en[key] ?? key;

  if (vars && typeof value === "string") {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v));
    }
  }

  return value;
}
