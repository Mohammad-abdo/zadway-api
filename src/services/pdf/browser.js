import puppeteer from "puppeteer";

/**
 * Singleton headless browser used to render PDFs from HTML.
 * Launching Chromium is expensive (~300ms cold); reusing one instance per
 * Node process keeps PDF generation fast and prevents file descriptor leaks.
 */
let browserPromise = null;

/** @returns {Promise<import("puppeteer").Browser>} */
export async function getBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    if (b.connected) return b;
    browserPromise = null;
  }

  browserPromise = puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  const browser = await browserPromise;

  browser.on("disconnected", () => {
    browserPromise = null;
  });

  return browser;
}

export async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch {
    // ignore
  } finally {
    browserPromise = null;
  }
}

for (const sig of ["SIGINT", "SIGTERM", "exit"]) {
  process.once(sig, () => {
    void closeBrowser();
  });
}
