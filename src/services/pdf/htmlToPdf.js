import fs from "node:fs/promises";
import { getBrowser } from "./browser.js";
import { FONT_PATHS } from "./pdfFontPaths.js";

let fontFaceCss = null;
let fontFacePromise = null;

/**
 * Read the bundled TTF files once and inline them as base64 `@font-face`
 * declarations. Embedding the fonts in every HTML document guarantees the
 * exact Arabic and Latin glyphs are available regardless of what fonts the
 * host OS / Chromium ship with.
 */
async function getFontFaceCss() {
  if (fontFaceCss) return fontFaceCss;
  if (fontFacePromise) return fontFacePromise;

  fontFacePromise = (async () => {
    const [latinTtf, arabicTtf] = await Promise.all([
      fs.readFile(FONT_PATHS.latin),
      fs.readFile(FONT_PATHS.arabic),
    ]);
    const latin64 = latinTtf.toString("base64");
    const arabic64 = arabicTtf.toString("base64");
    const css = `
@font-face {
  font-family: 'AppLatin';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(data:font/ttf;base64,${latin64}) format('truetype');
}
@font-face {
  font-family: 'AppArabic';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(data:font/ttf;base64,${arabic64}) format('truetype');
}`;
    fontFaceCss = css;
    return css;
  })();

  return fontFacePromise;
}

/**
 * @typedef {object} HtmlToPdfOptions
 * @property {"A4" | "Letter" | "A5"} [format]
 * @property {boolean} [landscape]
 * @property {{ top?: string; right?: string; bottom?: string; left?: string }} [margin]
 * @property {boolean} [printBackground]
 */

/**
 * Render an HTML document to a PDF buffer.
 *
 * The HTML should already include `<html dir="...">` and any `<style>` blocks
 * the document needs. The bundled font-faces (`AppLatin`, `AppArabic`) are
 * injected automatically and are available to use in CSS.
 *
 * @param {string} html
 * @param {HtmlToPdfOptions} [options]
 * @returns {Promise<Buffer>}
 */
export async function renderHtmlToPdf(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const fonts = await getFontFaceCss();
    const enriched = injectFontStyles(html, fonts);

    await page.setContent(enriched, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: options.format ?? "A4",
      landscape: options.landscape ?? false,
      printBackground: options.printBackground ?? true,
      margin: {
        top: options.margin?.top ?? "16mm",
        right: options.margin?.right ?? "12mm",
        bottom: options.margin?.bottom ?? "16mm",
        left: options.margin?.left ?? "12mm",
      },
      preferCSSPageSize: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Inject the `@font-face` block right after `<head>` so it applies before
 * any document styles.
 * @param {string} html
 * @param {string} fontCss
 */
function injectFontStyles(html, fontCss) {
  const tag = `<style data-app-fonts>${fontCss}</style>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
  }
  return `<!doctype html><html><head>${tag}</head><body>${html}</body></html>`;
}
