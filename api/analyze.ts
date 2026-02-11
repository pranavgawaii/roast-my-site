import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { parseAndValidateUrl } from "./_utils.js";
import { currentIstDateKey } from "./_rateLimit.js";

const PAGE_SPEED_BASE =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const ANALYSIS_CACHE_TTL_SECONDS = 60 * 60 * 12;

interface AuditValue {
  score?: number | null;
  displayValue?: string;
  numericValue?: number;
  details?: {
    items?: unknown[];
  };
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
      accessibility?: { score?: number };
      seo?: { score?: number };
      ["best-practices"]?: { score?: number };
    };
    audits?: Record<string, AuditValue>;
  };
}

type MetricsSource = "pagespeed" | "cached" | "estimated";

interface RoastMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  loadTime: string;
  firstContentfulPaint: string;
  largestContentfulPaint: string;
  totalBlockingTime: string;
  cumulativeLayoutShift: string;
}

interface DesignSignals {
  fontsDetected: string[];
  colorPalette: string[];
  imagesWithoutAlt: number;
  externalScriptCount: number;
  linkCount: number;
  brokenLinks: number;
  htmlBytes: number;
  fetchTimeMs: number;
  signalWarnings: string[];
}

interface AnalysisCachePayload {
  metrics: RoastMetrics;
  savedAt: string;
}

let redis: Redis | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token || url.includes("your_upstash") || url === "your_redis_url") {
    return null;
  }

  if (!redis) {
    try {
      redis = Redis.fromEnv();
    } catch (err) {
      console.error("Failed to initialize Redis in analyze:", err);
      return null;
    }
  }

  return redis;
}

function counterDateKey() {
  return currentIstDateKey();
}

async function incrementCounter(name: string) {
  const client = getRedis();
  if (!client) {
    return;
  }

  const key = `counter:${name}:${counterDateKey()}`;
  try {
    const next = await client.incr(key);
    if (next === 1) {
      await client.expire(key, 60 * 60 * 24 * 7);
    }
  } catch (err) {
    console.warn("Analyze counter increment failed:", err);
  }
}

function analysisCacheKey(normalizedUrl: string) {
  return `analysis:${encodeURIComponent(normalizedUrl)}`;
}

async function readAnalysisCache(normalizedUrl: string) {
  const client = getRedis();
  if (!client) {
    return null;
  }

  try {
    const payload = await client.get<AnalysisCachePayload>(analysisCacheKey(normalizedUrl));
    if (!payload || !payload.metrics) {
      return null;
    }
    return payload.metrics;
  } catch (err) {
    console.warn("Analyze cache read failed:", err);
    return null;
  }
}

async function writeAnalysisCache(normalizedUrl: string, metrics: RoastMetrics) {
  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    await client.set(
      analysisCacheKey(normalizedUrl),
      {
        metrics,
        savedAt: new Date().toISOString()
      },
      { ex: ANALYSIS_CACHE_TTL_SECONDS }
    );
  } catch (err) {
    console.warn("Analyze cache write failed:", err);
  }
}

function score(value?: number) {
  return Math.round((value || 0) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toSecondsLabel(ms: number) {
  return `${(ms / 1000).toFixed(1)} s`;
}

function toMsLabel(ms: number) {
  return `${Math.round(ms)} ms`;
}

function buildEstimatedMetrics(url: string, signals: DesignSignals): RoastMetrics {
  const hash = stableHash(url);
  const jitter = (hash % 21) - 10;
  const htmlKb = signals.htmlBytes / 1024;
  const fontPenalty = Math.max(0, signals.fontsDetected.length - 3) * 2.1;
  const scriptPenalty = Math.max(0, signals.externalScriptCount - 8) * 0.75;
  const linkPenalty = Math.max(0, signals.linkCount - 30) * 0.12;
  const brokenPenalty = signals.brokenLinks * 3.3;
  const imagePenalty = signals.imagesWithoutAlt * 1.1;

  const performance = clamp(
    Math.round(
      86 -
      fontPenalty -
      scriptPenalty -
      linkPenalty -
      brokenPenalty -
      imagePenalty * 0.5 +
      jitter * 0.35
    ),
    24,
    98
  );
  const accessibility = clamp(
    Math.round(
      91 -
      signals.imagesWithoutAlt * 3.4 -
      fontPenalty * 0.35 -
      brokenPenalty * 0.4 +
      jitter * 0.25
    ),
    20,
    99
  );
  const bestPractices = clamp(
    Math.round(88 - scriptPenalty * 1.15 - brokenPenalty * 0.8 + jitter * 0.3),
    24,
    99
  );
  const seo = clamp(
    Math.round(
      92 - signals.brokenLinks * 4.6 - (signals.linkCount < 6 ? 9 : 0) + jitter * 0.2
    ),
    25,
    99
  );

  const baseFetch = Math.max(350, signals.fetchTimeMs || 1100);
  const estimatedSpeedIndexMs =
    baseFetch * 1.6 +
    htmlKb * 7 +
    signals.externalScriptCount * 55 +
    (hash % 700);
  const fcpMs = estimatedSpeedIndexMs * 0.52;
  const lcpMs = estimatedSpeedIndexMs * 0.78 + signals.externalScriptCount * 25;
  const tbtMs =
    120 + Math.max(0, signals.externalScriptCount - 5) * 28 + (hash % 90);
  const clsValue = clamp(
    0.02 +
    Math.max(0, signals.externalScriptCount - 5) * 0.008 +
    (signals.imagesWithoutAlt > 8 ? 0.03 : 0) +
    (hash % 8) * 0.01,
    0.01,
    0.42
  );

  return {
    performance,
    accessibility,
    bestPractices,
    seo,
    loadTime: toSecondsLabel(estimatedSpeedIndexMs),
    firstContentfulPaint: toSecondsLabel(fcpMs),
    largestContentfulPaint: toSecondsLabel(lcpMs),
    totalBlockingTime: toMsLabel(tbtMs),
    cumulativeLayoutShift: clsValue.toFixed(2)
  };
}

async function getPageSpeedMetrics(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const apiKey = process.env.PAGESPEED_API_KEY?.trim();
    const apiUrl = new URL(PAGE_SPEED_BASE);
    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("category", "performance");
    apiUrl.searchParams.append("category", "accessibility");
    apiUrl.searchParams.append("category", "best-practices");
    apiUrl.searchParams.append("category", "seo");
    apiUrl.searchParams.set("strategy", "mobile");

    if (apiKey) {
      apiUrl.searchParams.set("key", apiKey);
    }

    const response = await fetch(apiUrl.toString(), { signal: controller.signal });

    if (response.status === 429) {
      console.warn("PageSpeed API rate limited (429). Trying cache/estimated metrics.");
      return null;
    }

    if (!response.ok) {
      throw new Error(`PageSpeed failed with ${response.status}.`);
    }

    const data = (await response.json()) as PageSpeedResponse;
    const audits = data.lighthouseResult?.audits || {};

    return {
      performance: score(data.lighthouseResult?.categories?.performance?.score),
      accessibility: score(data.lighthouseResult?.categories?.accessibility?.score),
      bestPractices: score(data.lighthouseResult?.categories?.["best-practices"]?.score),
      seo: score(data.lighthouseResult?.categories?.seo?.score),
      loadTime: audits["speed-index"]?.displayValue || "n/a",
      firstContentfulPaint: audits["first-contentful-paint"]?.displayValue || "n/a",
      largestContentfulPaint:
        audits["largest-contentful-paint"]?.displayValue || "n/a",
      totalBlockingTime: audits["total-blocking-time"]?.displayValue || "n/a",
      cumulativeLayoutShift:
        audits["cumulative-layout-shift"]?.displayValue || "n/a"
    } as RoastMetrics;
  } catch (err) {
    console.error("PageSpeed fetch error:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function countMatches(text: string, pattern: RegExp) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

async function checkLinkStatus(href: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const check = await fetch(href, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal
    });
    return check.status;
  } finally {
    clearTimeout(timeout);
  }
}

async function extractDesignSignals(url: string): Promise<DesignSignals> {
  const warnings: string[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const start = Date.now();
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    const end = Date.now();
    const html = await response.text();
    const htmlBytes = Buffer.byteLength(html, "utf8");
    const baseUrl = new URL(url);

    const fontFamilies = new Set<string>();
    const fontMatches = html.matchAll(/font-family\s*:\s*([^;}{]+)/gi);
    for (const match of fontMatches) {
      const list = (match[1] || "")
        .split(",")
        .map((item) => item.replace(/['"]/g, "").trim())
        .filter(Boolean);
      list.forEach((font) => fontFamilies.add(font));
    }

    const colorMatches =
      html.match(/#[a-fA-F0-9]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || [];
    const colorCounts = new Map<string, number>();
    colorMatches.forEach((color) => {
      const normalized = color.trim().toLowerCase();
      colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + 1);
    });
    const colorPalette = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color]) => color);

    const hrefMatches = Array.from(
      html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)
    );
    const linkTargets = hrefMatches
      .map((match) => match[1] || "")
      .filter((href) => href && !href.startsWith("#"))
      .map((href) => {
        try {
          return new URL(href, baseUrl).toString();
        } catch {
          return "";
        }
      })
      .filter((href) => href.startsWith("http://") || href.startsWith("https://"));

    const sampledLinks = Array.from(new Set(linkTargets)).slice(0, 6);
    const checks = await Promise.allSettled(sampledLinks.map((href) => checkLinkStatus(href)));
    const brokenLinks = checks.filter((result) => {
      if (result.status === "rejected") {
        warnings.push("link_check_partial");
        return true;
      }
      return result.value >= 400;
    }).length;

    return {
      fontsDetected: Array.from(fontFamilies).slice(0, 12),
      colorPalette,
      imagesWithoutAlt: countMatches(html, /<img(?![^>]*\balt=)[^>]*>/gi),
      externalScriptCount: countMatches(html, /<script[^>]+src=/gi),
      linkCount: countMatches(html, /<a\b/gi),
      brokenLinks,
      htmlBytes,
      fetchTimeMs: end - start,
      signalWarnings: Array.from(new Set(warnings))
    };
  } catch {
    return {
      fontsDetected: [],
      colorPalette: [],
      imagesWithoutAlt: 0,
      externalScriptCount: 0,
      linkCount: 0,
      brokenLinks: 0,
      htmlBytes: 0,
      fetchTimeMs: 0,
      signalWarnings: ["html_fetch_failed"]
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const url = parseAndValidateUrl(req.body?.url);
    const { metrics, designSignals, metricsSource } = await analyzeWebsite(url);

    return res.status(200).json({
      success: true,
      url,
      metrics,
      designSignals,
      metricsSource
    });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Performance analysis failed.";
    if (
      message.toLowerCase().includes("valid") ||
      message.toLowerCase().includes("blocked") ||
      message.toLowerCase().includes("url")
    ) {
      return res.status(400).json({ error: "Invalid URL", message });
    }
    return res.status(500).json({ error: "Analyze failed", message });
  }
}

export async function analyzeWebsite(url: string) {
  const startedAt = Date.now();
  const normalizedUrl = new URL(url).toString();
  const [designSignals, pageSpeedMetrics] = await Promise.all([
    extractDesignSignals(normalizedUrl),
    getPageSpeedMetrics(normalizedUrl)
  ]);

  let metricsSource: MetricsSource = "estimated";
  let metrics: RoastMetrics;

  if (pageSpeedMetrics) {
    metrics = pageSpeedMetrics;
    metricsSource = "pagespeed";
    await writeAnalysisCache(normalizedUrl, metrics);
    void incrementCounter("api:pagespeed_live");
  } else {
    const cachedMetrics = await readAnalysisCache(normalizedUrl);
    if (cachedMetrics) {
      metrics = cachedMetrics;
      metricsSource = "cached";
      void incrementCounter("api:pagespeed_cached");
    } else {
      metrics = buildEstimatedMetrics(normalizedUrl, designSignals);
      metricsSource = "estimated";
      void incrementCounter("api:pagespeed_estimated");
    }
  }

  const latencyMs = Date.now() - startedAt;
  console.info(
    "[Telemetry][Analyze]",
    JSON.stringify({
      url: normalizedUrl,
      metricsSource,
      latencyMs,
      signalWarnings: designSignals.signalWarnings
    })
  );

  return { metrics, designSignals, metricsSource };
}
