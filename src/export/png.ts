import puppeteer from "puppeteer";
import { resolve, basename } from "path";
import { mkdir } from "fs/promises";
import { startLocalServer } from "./local-server";

export async function exportPng(
  htmlPath: string,
  outputDir: string = "output"
): Promise<string> {
  const name = basename(htmlPath, ".html");
  const outPath = resolve(outputDir, `${name}-2x.png`);

  await mkdir(outputDir, { recursive: true });

  // Start a temporary local server so Puppeteer can resolve all paths
  const { server, baseUrl } = await startLocalServer();

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // 1080x1350 at 2x → 2160x2700 output
    await page.setViewport({
      width: 1080,
      height: 1350,
      deviceScaleFactor: 2,
    });

    // Navigate via HTTP so CSS @imports and font URLs all resolve
    await page.goto(`${baseUrl}/${htmlPath}`, {
      waitUntil: "networkidle0",
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Small delay to ensure rendering is complete
    await new Promise((r) => setTimeout(r, 300));

    // Screenshot the infographic element
    const element = await page.$("#infographic");
    if (!element) {
      await browser.close();
      throw new Error("Could not find #infographic element");
    }

    await element.screenshot({
      path: outPath,
      type: "png",
    });

    await browser.close();
    console.log(`✓ PNG exported: ${outPath}`);
    return outPath;
  } finally {
    server.stop();
  }
}
