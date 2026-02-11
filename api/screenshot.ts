import type { VercelRequest, VercelResponse } from "@vercel/node";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import { parseAndValidateUrl } from "./_utils.js";

export const config = {
  maxDuration: 30
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const LOCAL_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium"
];

function allowRedirect(originalUrl: string, finalUrl: string) {
  const originalHost = new URL(originalUrl).hostname.replace(/^www\./, "");
  const finalHost = new URL(finalUrl).hostname.replace(/^www\./, "");
  if (originalHost === finalHost) {
    return true;
  }
  return finalHost.endsWith(`.${originalHost}`) || originalHost.endsWith(`.${finalHost}`);
}

async function takeScreenshotBuffer(url: string) {
  const localPath = LOCAL_CHROME_PATHS.find((path) => existsSync(path));
  const isVercel = process.env.VERCEL === "1" || process.env.NOW_REGION;

  let executablePath: string | undefined;
  let args: string[] = [];
  let viewport = { width: 1200, height: 800 };

  if (isVercel) {
    const chromium = (await import("@sparticuz/chromium")).default;
    executablePath = await chromium.executablePath();
    args = chromium.args;
    const defaultViewport = chromium.defaultViewport;
    if (
      defaultViewport &&
      typeof defaultViewport.width === "number" &&
      typeof defaultViewport.height === "number"
    ) {
      viewport = {
        width: defaultViewport.width,
        height: defaultViewport.height
      };
    }
  } else {
    executablePath = process.env.CHROME_EXECUTABLE_PATH || localPath;
    args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
  }

  if (!executablePath) {
    throw new Error("No Chrome executable available for screenshot capture.");
  }

  const browser = await puppeteer.launch({
    args,
    defaultViewport: viewport,
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(22000);
    page.setDefaultTimeout(22000);
    await page.setViewport({ width: 1200, height: 800 });
    await navigateForScreenshot(page, url);

    const finalUrl = page.url();
    parseAndValidateUrl(finalUrl);
    if (!allowRedirect(url, finalUrl)) {
      throw new Error("Unexpected redirect detected.");
    }

    let quality = 80;
    while (quality >= 40) {
      const data = (await page.screenshot({
        fullPage: true,
        type: "jpeg",
        quality
      })) as Buffer;
      if (data.byteLength <= MAX_SIZE_BYTES) {
        return data;
      }
      quality -= 10;
    }

    throw new Error("Screenshot too large. Try a shorter page.");
  } finally {
    await browser.close();
  }
}

async function navigateForScreenshot(page: Page, url: string) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 22000
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    const partialUrl = page.url();
    const reachedPage =
      partialUrl &&
      partialUrl !== "about:blank" &&
      (partialUrl.startsWith("http://") || partialUrl.startsWith("https://"));

    if (!reachedPage) {
      throw new Error(`Navigation timeout before first paint: ${message}`);
    }
  }

  try {
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 4000 });
  } catch {
    // Some pages keep long-running requests open; proceed with current DOM.
  }

  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const url = parseAndValidateUrl(req.body?.url);
    const screenshot = await takeScreenshotBuffer(url);
    const base64 = Buffer.from(screenshot).toString("base64");
    return res.status(200).json({ success: true, screenshot: base64 });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Screenshot generation failed.";
    if (
      message.toLowerCase().includes("valid") ||
      message.toLowerCase().includes("blocked") ||
      message.toLowerCase().includes("url")
    ) {
      return res.status(400).json({ error: "Invalid URL", message });
    }
    return res.status(500).json({ error: "Screenshot failed", message });
  }
}

export async function captureWebsiteScreenshot(url: string) {
  const screenshot = await takeScreenshotBuffer(url);
  return Buffer.from(screenshot).toString("base64");
}
