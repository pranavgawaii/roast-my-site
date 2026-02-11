import type { VercelRequest, VercelResponse } from "@vercel/node";
import { existsSync, rmSync } from "node:fs";
import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import { parseAndValidateUrl } from "./_utils.js";

export const config = {
  maxDuration: 60
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const LOCAL_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium"
];

function resolveLambdaRuntimeTag() {
  const major = Number(process.versions.node.split(".")[0] || "20");
  if (major >= 22) {
    return "nodejs22.x";
  }
  if (major >= 20) {
    return "nodejs20.x";
  }
  return "nodejs18.x";
}

function resolveLambdaLibFile() {
  const major = Number(process.versions.node.split(".")[0] || "20");
  if (major >= 20) {
    return "/tmp/al2023/lib/libnss3.so";
  }
  return "/tmp/al2/lib/libnss3.so";
}

function prepareVercelChromiumRuntime() {
  const runtimeTag = resolveLambdaRuntimeTag();
  process.env.AWS_LAMBDA_JS_RUNTIME ??= runtimeTag;
  process.env.AWS_EXECUTION_ENV ??= `AWS_Lambda_${runtimeTag}`;
}

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
    prepareVercelChromiumRuntime();
    const chromium = (await import("@sparticuz/chromium")).default;
    const lambdaLibFile = resolveLambdaLibFile();
    if (!existsSync(lambdaLibFile) && existsSync("/tmp/chromium")) {
      // Force a clean extract when a stale binary exists without required shared libs.
      rmSync("/tmp/chromium", { force: true });
    }
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
    headless: isVercel ? "shell" : true
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(14000);
    page.setDefaultTimeout(14000);
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
        // Viewport-only capture is faster and aligns with preview-card hero framing.
        fullPage: false,
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
      timeout: 12000
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
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 2000 });
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
