import puppeteer from "puppeteer";
import { resolve, basename } from "path";
import { mkdir } from "fs/promises";
import { startLocalServer } from "./local-server";

export async function exportGif(
  htmlPath: string,
  outputDir: string = "output",
  options: {
    fps?: number;
    animationDuration?: number;
    holdDuration?: number;
  } = {}
): Promise<string> {
  const { fps = 6, animationDuration = 5, holdDuration = 1.5 } = options;
  const name = basename(htmlPath, ".html");
  const outPath = resolve(outputDir, `${name}.gif`);
  // Full LinkedIn resolution — optimize via low fps + octree palette
  const width = 1080;
  const height = 1350;

  await mkdir(outputDir, { recursive: true });

  const GIFEncoder = (await import("gif-encoder-2")).default;
  const { server, baseUrl } = await startLocalServer();

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // 1x scale for GIF to keep file size manageable
    await page.setViewport({ width, height, deviceScaleFactor: 1 });

    await page.goto(`${baseUrl}/${htmlPath}`, {
      waitUntil: "networkidle0",
    });

    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 300));

    // Add .animated class to trigger CSS animations
    await page.evaluate(() => {
      const el = document.getElementById("infographic");
      if (el) el.classList.add("animated");
    });

    const totalFrames = Math.ceil(animationDuration * fps);
    const holdFrames = Math.ceil(holdDuration * fps);
    const frameDelay = Math.round(1000 / fps);

    // Create GIF encoder — "octree" is faster and produces smaller files for dark themes
    const encoder = new GIFEncoder(width, height, "octree", false);
    encoder.setDelay(frameDelay);
    encoder.setRepeat(0); // Loop forever
    encoder.start();

    console.log(
      `Capturing ${totalFrames + holdFrames} frames at ${fps}fps...`
    );

    // Helper: capture a frame as raw RGBA pixel data
    const cdp = await page.createCDPSession();
    async function captureFrame(): Promise<number[]> {
      const { data } = await cdp.send("Page.captureScreenshot", {
        format: "png",
        clip: { x: 0, y: 0, width, height, scale: 1 },
      });
      return page.evaluate(
        async (base64Data: string, w: number, h: number) => {
          const img = new Image();
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.src = `data:image/png;base64,${base64Data}`;
          });
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          return Array.from(ctx.getImageData(0, 0, w, h).data);
        },
        data,
        width,
        height
      );
    }

    // Capture animation frames
    for (let i = 0; i < totalFrames; i++) {
      encoder.addFrame(await captureFrame());
      process.stdout.write(
        `\r  Frame ${i + 1}/${totalFrames + holdFrames}`
      );
      if (i < totalFrames - 1) {
        await new Promise((r) => setTimeout(r, frameDelay));
      }
    }

    // Capture and repeat final frame for hold
    const finalPixels = await captureFrame();
    for (let i = 0; i < holdFrames; i++) {
      encoder.addFrame(finalPixels);
      process.stdout.write(
        `\r  Frame ${totalFrames + i + 1}/${totalFrames + holdFrames}`
      );
    }

    await cdp.detach();

    console.log(""); // newline after progress

    encoder.finish();

    const buffer = encoder.out.getData();
    await Bun.write(outPath, buffer);

    await browser.close();
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`✓ GIF exported: ${outPath} (${sizeMB} MB)`);
    return outPath;
  } finally {
    server.stop();
  }
}
