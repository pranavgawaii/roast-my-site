import { parseAndValidateUrl } from "./_utils";

type MetricsSource = "firecrawl";

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

interface RoastDesignSignals {
  fontsDetected: string[];
  colorPalette: string[];
  imagesWithoutAlt: number;
  externalScriptCount: number;
  linkCount: number;
  brokenLinks: number;
  htmlBytes?: number;
  fetchTimeMs?: number;
  signalWarnings?: string[];
}

export interface FirecrawlSignals {
  title: string;
  description: string;
  markdown: string;
  markdownExcerpt: string;
  wordCount: number;
  headingCount: number;
  h1Count: number;
  h2Count: number;
  linkCount: number;
  brokenLinks: number;
  brokenLinkSamples: string[];
  imagesWithoutAlt: number;
  fetchTimeMs: number;
}

export interface FirecrawlAnalysisResult {
  metrics: RoastMetrics;
  metricsSource: MetricsSource;
  designSignals: RoastDesignSignals;
  contentSignals: FirecrawlSignals;
}

interface FirecrawlScrapeResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toSecondsLabel(ms: number) {
  return `${(ms / 1000).toFixed(1)} s`;
}

function toMsLabel(ms: number) {
  return `${Math.max(0, Math.round(ms))} ms`;
}

function extractText(value: unknown) {
  return asString(value).replace(/\s+/g, " ").trim();
}

function extractHeadingCounts(markdown: string) {
  const h1 = (markdown.match(/^#\s+/gm) || []).length;
  const h2 = (markdown.match(/^##\s+/gm) || []).length;
  const all = (markdown.match(/^#{1,6}\s+/gm) || []).length;
  return { h1Count: h1, h2Count: h2, headingCount: all };
}

function extractWordCount(markdown: string) {
  const normalized = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_!()[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(" ").filter(Boolean).length;
}

function parseLinksFromMarkdown(markdown: string, baseUrl: URL) {
  const links = new Set<string>();
  const regex = /\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown))) {
    const raw = match[1]?.trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }
    try {
      const parsed = new URL(raw, baseUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        links.add(parsed.toString());
      }
    } catch {
      // ignore malformed links
    }
  }
  return Array.from(links);
}

function parseImageAltCount(markdown: string) {
  const imageMatches = markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
  let missing = 0;
  for (const match of imageMatches) {
    const alt = (match[1] || "").trim();
    if (!alt) {
      missing += 1;
    }
  }
  return missing;
}

async function checkLinkStatus(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal
    });
    if (response.status === 405 || response.status >= 500) {
      const fallback = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal
      });
      return fallback.status;
    }
    return response.status;
  } catch {
    return 599;
  } finally {
    clearTimeout(timeout);
  }
}

function parseFirecrawlPayload(url: string, payload: FirecrawlScrapeResponse, fetchTimeMs: number) {
  const data = payload.data || {};
  const metadata =
    (data.metadata && typeof data.metadata === "object" ? data.metadata : {}) as Record<
      string,
      unknown
    >;

  const markdown =
    asString(data.markdown) ||
    asString(data.content) ||
    asString(data.rawMarkdown) ||
    "";

  const title = extractText(metadata.title || data.title || "");
  const description = extractText(metadata.description || data.description || "");
  const markdownExcerpt = markdown.slice(0, 900).trim();
  const wordCount = extractWordCount(markdown);
  const { h1Count, h2Count, headingCount } = extractHeadingCounts(markdown);

  const baseUrl = new URL(url);
  const linkCandidates = new Set<string>();
  const dataLinks = Array.isArray(data.links) ? data.links : [];
  dataLinks.forEach((entry) => {
    const raw = asString(entry).trim();
    if (!raw) {
      return;
    }
    try {
      const parsed = new URL(raw, baseUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        linkCandidates.add(parsed.toString());
      }
    } catch {
      // ignore malformed links
    }
  });

  parseLinksFromMarkdown(markdown, baseUrl).forEach((href) => linkCandidates.add(href));
  const links = Array.from(linkCandidates);

  return {
    title,
    description,
    markdown,
    markdownExcerpt,
    wordCount,
    headingCount,
    h1Count,
    h2Count,
    links,
    imagesWithoutAlt: parseImageAltCount(markdown),
    fetchTimeMs
  };
}

function buildMetrics(signals: {
  title: string;
  description: string;
  wordCount: number;
  h1Count: number;
  h2Count: number;
  linkCount: number;
  brokenLinks: number;
  imagesWithoutAlt: number;
  fetchTimeMs: number;
}) {
  const titleLength = signals.title.length;
  const descriptionLength = signals.description.length;

  const titlePenalty =
    titleLength === 0 ? 20 : titleLength < 30 || titleLength > 65 ? 8 : 0;
  const descriptionPenalty =
    descriptionLength === 0 ? 12 : descriptionLength < 90 || descriptionLength > 170 ? 5 : 0;
  const headingPenalty = signals.h1Count === 0 ? 12 : 0;
  const hierarchyPenalty = signals.h2Count === 0 ? 6 : 0;
  const wordPenalty = signals.wordCount < 220 ? 9 : 0;
  const linkPenalty = Math.min(24, signals.brokenLinks * 6);
  const imagePenalty = Math.min(16, signals.imagesWithoutAlt * 4);
  const fetchPenalty = signals.fetchTimeMs > 5000 ? 10 : signals.fetchTimeMs > 3000 ? 4 : 0;

  const seo = clamp(
    Math.round(
      92 -
        titlePenalty -
        descriptionPenalty -
        headingPenalty -
        hierarchyPenalty -
        wordPenalty -
        linkPenalty
    ),
    12,
    99
  );

  const bestPractices = clamp(
    Math.round(88 - linkPenalty - hierarchyPenalty - Math.min(10, signals.linkCount < 4 ? 8 : 0)),
    15,
    99
  );

  const accessibility = clamp(
    Math.round(84 - imagePenalty - headingPenalty * 0.4 - Math.min(8, signals.wordCount < 120 ? 6 : 0)),
    20,
    99
  );

  const performance = clamp(
    Math.round(90 - fetchPenalty - Math.min(12, signals.brokenLinks * 3)),
    28,
    99
  );

  return {
    performance,
    accessibility,
    bestPractices,
    seo,
    loadTime: toSecondsLabel(signals.fetchTimeMs),
    firstContentfulPaint: toSecondsLabel(Math.max(250, signals.fetchTimeMs * 0.45)),
    largestContentfulPaint: toSecondsLabel(Math.max(500, signals.fetchTimeMs * 0.82)),
    totalBlockingTime: toMsLabel(Math.max(30, signals.brokenLinks * 18 + 40)),
    cumulativeLayoutShift: (Math.max(0.01, Math.min(0.28, signals.brokenLinks * 0.02 + 0.03))).toFixed(2)
  } as RoastMetrics;
}

export async function analyzeContentWithFirecrawl(urlInput: string): Promise<FirecrawlAnalysisResult> {
  const url = parseAndValidateUrl(urlInput);
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is missing.");
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firecrawl scrape failed (${response.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as FirecrawlScrapeResponse;
    const fetchTimeMs = Date.now() - started;
    const parsed = parseFirecrawlPayload(url, payload, fetchTimeMs);
    const sampledLinks = parsed.links.slice(0, 12);
    const checked = await Promise.all(sampledLinks.map((link) => checkLinkStatus(link)));
    const brokenIndices = checked
      .map((status, index) => (status >= 400 ? index : -1))
      .filter((index) => index >= 0);
    const brokenLinks = brokenIndices.length;
    const brokenLinkSamples = brokenIndices.map((index) => sampledLinks[index]).slice(0, 4);

    const metrics = buildMetrics({
      title: parsed.title,
      description: parsed.description,
      wordCount: parsed.wordCount,
      h1Count: parsed.h1Count,
      h2Count: parsed.h2Count,
      linkCount: parsed.links.length,
      brokenLinks,
      imagesWithoutAlt: parsed.imagesWithoutAlt,
      fetchTimeMs: parsed.fetchTimeMs
    });

    const contentSignals: FirecrawlSignals = {
      title: parsed.title,
      description: parsed.description,
      markdown: parsed.markdown,
      markdownExcerpt: parsed.markdownExcerpt,
      wordCount: parsed.wordCount,
      headingCount: parsed.headingCount,
      h1Count: parsed.h1Count,
      h2Count: parsed.h2Count,
      linkCount: parsed.links.length,
      brokenLinks,
      brokenLinkSamples,
      imagesWithoutAlt: parsed.imagesWithoutAlt,
      fetchTimeMs: parsed.fetchTimeMs
    };

    const designSignals: RoastDesignSignals = {
      fontsDetected: [],
      colorPalette: [],
      imagesWithoutAlt: parsed.imagesWithoutAlt,
      externalScriptCount: 0,
      linkCount: parsed.links.length,
      brokenLinks,
      htmlBytes: Buffer.byteLength(parsed.markdown || "", "utf8"),
      fetchTimeMs: parsed.fetchTimeMs,
      signalWarnings: []
    };

    return {
      metrics,
      metricsSource: "firecrawl",
      designSignals,
      contentSignals
    };
  } finally {
    clearTimeout(timeout);
  }
}
