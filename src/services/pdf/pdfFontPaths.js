import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Paths to OFL Noto fonts under `api/assets/fonts`. */
export const FONT_PATHS = {
  latin: join(__dirname, "../../../assets/fonts/NotoSans-Regular.ttf"),
  arabic: join(__dirname, "../../../assets/fonts/NotoSansArabic-Regular.ttf"),
};
