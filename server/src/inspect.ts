import { chromium } from "playwright";
import { buildSeoChecks } from "./seo";
import type { RawSeo, SeoReport } from "./seo";

export type ViewportShot = {
  label: string;
  width: number;
  height: number;
  image: string | null; // data URL (JPEG), null if the capture failed
  overflowing: boolean; // true if the page is wider than the screen
  pageWidth: number | null;
  error?: string;
};

export type InspectionResult = {
  shots: ViewportShot[];
  seo: SeoReport | null;
};

const VIEWPORTS = [
  { label: "Phone", width: 375, height: 667 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Desktop", width: 1440, height: 900 },
];

// This code runs inside the browser page. It is written as a string so the
// server does not need the DOM types.
const SEO_SCRIPT = `(() => {
  const attr = (selector, name) =>
    (document.querySelector(selector)?.getAttribute(name) ?? '').trim();
  const h1s = Array.from(document.querySelectorAll('h1'))
    .map((el) => (el.textContent || '').trim())
    .filter(Boolean);
  const images = Array.from(document.querySelectorAll('img'));
  return {
    title: document.title.trim(),
    description: attr('meta[name="description"]', 'content'),
    viewport: attr('meta[name="viewport"]', 'content'),
    lang: (document.documentElement.getAttribute('lang') || '').trim(),
    h1Count: h1s.length,
    h1Text: h1s[0] || '',
    imageCount: images.length,
    imagesMissingAlt: images.filter((img) => !img.hasAttribute('alt')).length,
  };
})()`;

export async function inspectPage(url: string): Promise<InspectionResult> {
  const browser = await chromium.launch();

  try {
    const shots: ViewportShot[] = [];
    let seo: SeoReport | null = null;

    // One browser, one viewport after the other (lighter on memory)
    for (const [index, viewport] of VIEWPORTS.entries()) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 20_000,
        });
        // Give the page a few more seconds to finish loading, but do not fail if it does not
        await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(1_500);

        // SEO checks are read once, on the first page load (phone size)
        if (index === 0) {
          try {
            const raw = (await page.evaluate(SEO_SCRIPT)) as RawSeo;
            seo = buildSeoChecks(raw);
          } catch (err) {
            console.error("Could not read SEO data:", err);
          }
        }

        // Horizontal overflow: the content is wider than the screen
        const pageWidth = (await page.evaluate(
          "document.documentElement.scrollWidth",
        )) as number;
        const buffer = await page.screenshot({ type: "jpeg", quality: 60 });

        shots.push({
          ...viewport,
          image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
          overflowing: pageWidth > viewport.width + 1,
          pageWidth,
        });
      } catch (err) {
        shots.push({
          ...viewport,
          image: null,
          overflowing: false,
          pageWidth: null,
          error:
            err instanceof Error
              ? err.message.split("\n")[0]
              : "Capture failed",
        });
      } finally {
        await context.close();
      }
    }

    return { shots, seo };
  } finally {
    await browser.close();
  }
}
