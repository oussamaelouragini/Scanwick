import { chromium } from "playwright";

export type ViewportShot = {
  label: string;
  width: number;
  height: number;
  image: string | null; // data URL (JPEG), null if the capture failed
  overflowing: boolean; // true if the page is wider than the screen
  pageWidth: number | null;
  error?: string;
};

const VIEWPORTS = [
  { label: "Phone", width: 375, height: 667 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Desktop", width: 1440, height: 900 },
];

export async function captureScreenshots(url: string): Promise<ViewportShot[]> {
  const browser = await chromium.launch();

  try {
    const shots: ViewportShot[] = [];

    // One browser, one viewport after the other (lighter on memory)
    for (const viewport of VIEWPORTS) {
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

        // Horizontal overflow: the content is wider than the screen
        const pageWidth = await page.evaluate(
          () => document.documentElement.scrollWidth,
        );
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

    return shots;
  } finally {
    await browser.close();
  }
}
