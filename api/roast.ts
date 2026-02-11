import type { VercelRequest, VercelResponse } from "@vercel/node";
import Groq from "groq-sdk";
import { Redis } from "@upstash/redis";
import { analyzeWebsite } from "./analyze";
import { parseAndValidateUrl } from "./_utils";
import { captureWebsiteScreenshot } from "./screenshot";
import { isAdminEmail, resolveAuthContext } from "./_auth";
import { consumeDailyUsage, currentIstDateKey } from "./_rateLimit";
import { appendUserHistory } from "./_history";
import { analyzeContentWithFirecrawl, type FirecrawlSignals } from "./firecrawl";

const ROAST_V11_ENABLED = process.env.ROAST_V11_ENABLED !== "0";
const PRO_TIER_ENABLED = process.env.PRO_TIER_ENABLED !== "0";
const OPENERS_TTL_SECONDS = 60 * 60 * 24 * 7;

const ROAST_SYSTEM_PROMPT = `You are RoastMySite AI.
You create brutally funny but constructive website roasts.
Return JSON only and follow schema exactly.
Keep every line specific to provided screenshot/signals/metrics.
Avoid generic filler and repeated catchphrases.`;

const BLOCKED_STALE_PHRASES = [
  "chaotic energy",
  "side quest",
  "committee argued in figma",
  "2015 energy",
  "redemption arc"
];

type PersonaOption = "auto" | "assassin" | "kitchen" | "courtroom" | "sports";
type RoastPersona = Exclude<PersonaOption, "auto">;
type RoastMode = "content" | "design";

type MetricsSource = "pagespeed" | "cached" | "estimated" | "firecrawl";
type EvidenceImpact = "high" | "medium" | "low";
type FixEffort = "S" | "M" | "L";

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

interface RoastEvidence {
  label: string;
  value: string;
  impact: EvidenceImpact;
}

interface RoastFix {
  title: string;
  why: string;
  effort: FixEffort;
}

interface RoastStyleProfile {
  key: RoastPersona;
  name: string;
  voice: string;
  metaphorDomain: string;
  openingPattern: string;
  stylePenalty: number;
}

interface StructuredRoast {
  opening: string;
  burns: string[];
  evidence: RoastEvidence[];
  fixes: RoastFix[];
  closing: string;
}

const STYLE_PROFILES: Record<RoastPersona, RoastStyleProfile> = {
  assassin: {
    key: "assassin",
    name: "Stand-up Assassin",
    voice: "tight stand-up punchlines",
    metaphorDomain: "open mic comedy set",
    openingPattern: "Start with a one-liner stage opener.",
    stylePenalty: 6
  },
  kitchen: {
    key: "kitchen",
    name: "Kitchen Nightmare",
    voice: "chef-style urgency and sharp critique",
    metaphorDomain: "chaotic restaurant kitchen",
    openingPattern: "Open like a chef seeing a ruined service.",
    stylePenalty: 8
  },
  courtroom: {
    key: "courtroom",
    name: "Courtroom Roast",
    voice: "dramatic prosecutor with receipts",
    metaphorDomain: "courtroom trial",
    openingPattern: "Open like a formal charge sheet.",
    stylePenalty: 4
  },
  sports: {
    key: "sports",
    name: "Sports Commentary",
    voice: "play-by-play commentator with savage analysis",
    metaphorDomain: "live sports broadcast",
    openingPattern: "Open with first-quarter disaster commentary.",
    stylePenalty: 5
  }
};

const WEIGHTED_PERSONA_ROTATION: Array<{ persona: RoastPersona; weight: number }> = [
  { persona: "assassin", weight: 0.29 },
  { persona: "kitchen", weight: 0.29 },
  { persona: "courtroom", weight: 0.21 },
  { persona: "sports", weight: 0.21 }
];

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
      console.error("Failed to initialize Redis:", err);
      return null;
    }
  }

  return redis;
}

function counterDateKey() {
  return currentIstDateKey();
}

async function incrementCounter(name: string, amount = 1) {
  const client = getRedis();
  if (!client) {
    return;
  }

  const key = `counter:${name}:${counterDateKey()}`;
  try {
    if (amount === 1) {
      const next = await client.incr(key);
      if (next === 1) {
        await client.expire(key, 60 * 60 * 24 * 7);
      }
      return;
    }

    const current = Number((await client.get<number>(key)) || 0);
    await client.set(key, current + amount, { ex: 60 * 60 * 24 * 7 });
  } catch (err) {
    console.warn("Counter increment failed:", err);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getErrorMessage(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }
  return String(caught);
}

function parsePersona(value: unknown): PersonaOption {
  const normalized = String(value || "auto").trim().toLowerCase();
  if (
    normalized === "assassin" ||
    normalized === "kitchen" ||
    normalized === "courtroom" ||
    normalized === "sports" ||
    normalized === "auto"
  ) {
    return normalized;
  }
  return "auto";
}

function parseRoastMode(value: unknown): RoastMode | "auto" {
  const normalized = String(value || "auto").trim().toLowerCase();
  if (normalized === "content" || normalized === "design" || normalized === "auto") {
    return normalized;
  }
  return "auto";
}

function pickWeightedPersona() {
  const random = Math.random();
  let cursor = 0;
  for (const item of WEIGHTED_PERSONA_ROTATION) {
    cursor += item.weight;
    if (random <= cursor) {
      return item.persona;
    }
  }
  return "assassin";
}

function resolvePersona(input: PersonaOption): RoastStyleProfile {
  const persona = input === "auto" ? pickWeightedPersona() : input;
  return STYLE_PROFILES[persona];
}

function computeDesignQuality(signals: RoastDesignSignals) {
  const fontPenalty = clamp(Math.max(0, signals.fontsDetected.length - 3) * 4, 0, 20);
  const scriptPenalty = clamp(Math.max(0, signals.externalScriptCount - 8) * 2, 0, 20);
  const brokenPenalty = clamp(signals.brokenLinks * 8, 0, 30);
  const altPenalty = clamp(signals.imagesWithoutAlt * 2, 0, 25);
  const palettePenalty = clamp(Math.max(0, signals.colorPalette.length - 7) * 2, 0, 10);

  return clamp(100 - fontPenalty - scriptPenalty - brokenPenalty - altPenalty - palettePenalty, 5, 100);
}

function calculateScores(args: {
  metrics: RoastMetrics;
  designSignals: RoastDesignSignals;
  styleProfile: RoastStyleProfile;
}) {
  const metricsWeighted =
    args.metrics.performance * 0.35 +
    args.metrics.accessibility * 0.25 +
    args.metrics.bestPractices * 0.2 +
    args.metrics.seo * 0.1;

  const designQuality = computeDesignQuality(args.designSignals);
  const runtimeSignal =
    args.designSignals.fetchTimeMs && args.designSignals.fetchTimeMs > 0
      ? args.designSignals.fetchTimeMs
      : Date.now();
  const runtimeJitter = clamp((runtimeSignal % 9) - 4, -3, 3);

  const qualityScore = clamp(
    Math.round(metricsWeighted + designQuality * 0.1 + runtimeJitter),
    1,
    100
  );

  const severityScore = clamp(
    Math.round(100 - qualityScore + args.styleProfile.stylePenalty),
    0,
    100
  );

  return { qualityScore, severityScore };
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((item) => item.length > 2);
}

function similarity(a: string, b: string) {
  const aTokens = new Set(tokens(a));
  const bTokens = new Set(tokens(b));
  if (!aTokens.size || !bTokens.size) {
    return 0;
  }

  let intersection = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) {
      intersection += 1;
    }
  });

  const union = new Set([...aTokens, ...bTokens]).size;
  return intersection / union;
}

async function readRecentOpeners(domain: string) {
  const client = getRedis();
  if (!client) {
    return [] as string[];
  }

  try {
    const key = `roast:openers:${domain}`;
    const values = await client.get<string[]>(key);
    if (!Array.isArray(values)) {
      return [];
    }
    return values.filter((item) => typeof item === "string").slice(0, 5);
  } catch {
    return [];
  }
}

async function writeRecentOpeners(domain: string, opening: string) {
  const client = getRedis();
  if (!client || !opening.trim()) {
    return;
  }

  try {
    const key = `roast:openers:${domain}`;
    const current = await readRecentOpeners(domain);
    const updated = [opening, ...current.filter((item) => item !== opening)].slice(0, 5);
    await client.set(key, updated, { ex: OPENERS_TTL_SECONDS });
  } catch {
    // ignore opener cache failures
  }
}

function extractJsonObject(raw: string) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw;
}

function toTextContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (entry && typeof entry === "object" && "text" in entry) {
          return String((entry as { text?: string }).text || "");
        }
        return "";
      })
      .join("\n");
  }
  return "";
}

function sanitizeImpact(value: unknown): EvidenceImpact {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "medium";
}

function sanitizeEffort(value: unknown): FixEffort {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "S" || normalized === "M" || normalized === "L") {
    return normalized;
  }
  return "M";
}

function buildDefaultEvidence(metrics: RoastMetrics, designSignals: RoastDesignSignals) {
  const evidence: RoastEvidence[] = [
    {
      label: "Performance",
      value: `${metrics.performance}/100 with load time ${metrics.loadTime}`,
      impact: metrics.performance < 60 ? "high" : metrics.performance < 80 ? "medium" : "low"
    },
    {
      label: "Accessibility",
      value: `${metrics.accessibility}/100 and ${designSignals.imagesWithoutAlt} images missing alt text`,
      impact: designSignals.imagesWithoutAlt > 5 ? "high" : designSignals.imagesWithoutAlt > 0 ? "medium" : "low"
    },
    {
      label: "Runtime Weight",
      value: `${designSignals.externalScriptCount} external scripts, ${designSignals.brokenLinks} broken sampled links`,
      impact:
        designSignals.externalScriptCount > 12 || designSignals.brokenLinks > 1
          ? "high"
          : "medium"
    }
  ];

  if (designSignals.fontsDetected.length) {
    evidence.push({
      label: "Typography Spread",
      value: `${designSignals.fontsDetected.length} font families detected`,
      impact: designSignals.fontsDetected.length > 4 ? "medium" : "low"
    });
  }

  return evidence;
}

function buildDefaultFixes(metrics: RoastMetrics, designSignals: RoastDesignSignals) {
  const pool: RoastFix[] = [
    {
      title: "Cut third-party script bloat",
      why: `${designSignals.externalScriptCount} external scripts are increasing blocking time and execution cost.`,
      effort: "M"
    },
    {
      title: "Fix image accessibility",
      why: `${designSignals.imagesWithoutAlt} images are missing alt text and hurt accessibility score.`,
      effort: "S"
    },
    {
      title: "Improve LCP element delivery",
      why: `Largest Contentful Paint is ${metrics.largestContentfulPaint}; optimize hero media and preload only what is critical.`,
      effort: "M"
    },
    {
      title: "Reduce layout instability",
      why: `CLS is ${metrics.cumulativeLayoutShift}; reserve space for media/components before they render.`,
      effort: "S"
    },
    {
      title: "Unify typography system",
      why: `${designSignals.fontsDetected.length} fonts detected; limiting to 2-3 improves visual hierarchy and brand consistency.`,
      effort: "S"
    },
    {
      title: "Repair broken navigation paths",
      why: `${designSignals.brokenLinks} sampled links failed; broken routes kill trust and conversion flow.`,
      effort: "M"
    },
    {
      title: "Optimize interaction responsiveness",
      why: `Total Blocking Time is ${metrics.totalBlockingTime}; split long tasks and defer non-critical JS.`,
      effort: "L"
    }
  ];

  return pool;
}

function sanitizeStructured(
  raw: unknown,
  metrics: RoastMetrics,
  designSignals: RoastDesignSignals
): StructuredRoast {
  const fallbackEvidence = buildDefaultEvidence(metrics, designSignals);
  const fallbackFixes = buildDefaultFixes(metrics, designSignals);

  const object = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const opening = String(object.opening || "").trim();
  const closing = String(object.closing || "").trim();

  const burns = Array.isArray(object.burns)
    ? object.burns.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const evidence = Array.isArray(object.evidence)
    ? object.evidence
        .map((item) => {
          const entry = item as Record<string, unknown>;
          return {
            label: String(entry?.label || "").trim(),
            value: String(entry?.value || "").trim(),
            impact: sanitizeImpact(entry?.impact)
          };
        })
        .filter((item) => item.label && item.value)
    : [];

  const fixes = Array.isArray(object.fixes)
    ? object.fixes
        .map((item) => {
          const entry = item as Record<string, unknown>;
          return {
            title: String(entry?.title || "").trim(),
            why: String(entry?.why || "").trim(),
            effort: sanitizeEffort(entry?.effort)
          };
        })
        .filter((item) => item.title && item.why)
    : [];

  const normalizedBurns = burns.length
    ? burns.slice(0, 5)
    : [
        `Performance ${metrics.performance}/100 means the first impression is slower than it should be.`,
        `${designSignals.externalScriptCount} external scripts suggest too much code before user value appears.`,
        `${designSignals.imagesWithoutAlt} images missing alt text makes accessibility feel optional when it should be core.`
      ];

  const normalizedEvidence = [...evidence, ...fallbackEvidence].slice(0, 5);
  const dedupFixes = [...fixes, ...fallbackFixes].filter(
    (item, index, arr) => arr.findIndex((entry) => entry.title === item.title) === index
  );

  return {
    opening:
      opening ||
      "Your homepage walked into the room with confidence, but execution forgot to show up.",
    burns: normalizedBurns.slice(0, 3),
    evidence: normalizedEvidence.slice(0, 3),
    fixes: dedupFixes.slice(0, 5),
    closing:
      closing ||
      "Ship these changes and this roast can turn into a proper comeback story for your conversions."
  };
}

function composeRoastText(structured: StructuredRoast) {
  return `${structured.opening}\n\n${structured.burns.join("\n\n")}\n\nTop fixes:\n${structured.fixes
    .map((fix, index) => `${index + 1}) ${fix.title}: ${fix.why}`)
    .join("\n")}\n\n${structured.closing}`;
}

function buildPrompt(args: {
  url: string;
  metrics: RoastMetrics;
  metricsSource?: MetricsSource;
  designSignals: RoastDesignSignals;
  styleProfile: RoastStyleProfile;
  roastMode: RoastMode;
  contentSignals?: FirecrawlSignals;
  blockedPhrases?: string[];
}) {
  const modeInstruction =
    args.roastMode === "content"
      ? `Roast mode: CONTENT.
Focus on copy quality, heading structure, SEO metadata, and link hygiene.
Do not talk about colors, gradients, spacing, or visual layout unless explicitly present in provided content signals.
Mention at least one issue from title/description/H1/H2/links/word count.`
      : `Roast mode: DESIGN.
Focus on visual hierarchy, performance, accessibility, and UX execution tied to screenshot + metrics.`;

  const contentSection =
    args.roastMode === "content" && args.contentSignals
      ? `
Content signals:
- Title: ${args.contentSignals.title || "missing"}
- Description: ${args.contentSignals.description || "missing"}
- Word count: ${args.contentSignals.wordCount}
- Heading count: ${args.contentSignals.headingCount} (H1: ${args.contentSignals.h1Count}, H2: ${args.contentSignals.h2Count})
- Link count: ${args.contentSignals.linkCount}
- Broken links sampled: ${args.contentSignals.brokenLinks}
- Broken link samples: ${args.contentSignals.brokenLinkSamples.join(", ") || "none"}
- Images missing alt (from markdown): ${args.contentSignals.imagesWithoutAlt}
- Fetch latency ms: ${args.contentSignals.fetchTimeMs}
- Markdown excerpt:
${args.contentSignals.markdownExcerpt || "n/a"}`
      : "";

  return `Roast this website: ${args.url}

Output schema (JSON only):
{
  "opening": "string",
  "burns": ["string", "string", "string"],
  "evidence": [
    {"label": "string", "value": "string", "impact": "high|medium|low"},
    {"label": "string", "value": "string", "impact": "high|medium|low"},
    {"label": "string", "value": "string", "impact": "high|medium|low"}
  ],
  "fixes": [
    {"title": "string", "why": "string", "effort": "S|M|L"},
    {"title": "string", "why": "string", "effort": "S|M|L"},
    {"title": "string", "why": "string", "effort": "S|M|L"},
    {"title": "string", "why": "string", "effort": "S|M|L"},
    {"title": "string", "why": "string", "effort": "S|M|L"}
  ],
  "closing": "string"
}

Constraints:
- ${modeInstruction}
- Persona: ${args.styleProfile.name}
- Voice: ${args.styleProfile.voice}
- Metaphor world: ${args.styleProfile.metaphorDomain}
- Opening rule: ${args.styleProfile.openingPattern}
- Must include 3 specific burns tied to numbers below.
- Exactly 5 fixes.
- Funny but constructive.
- Avoid stale generic lines.
- Avoid phrases: ${(args.blockedPhrases || []).concat(BLOCKED_STALE_PHRASES).join(", ")}

Metrics:
- Performance: ${args.metrics.performance}/100
- Accessibility: ${args.metrics.accessibility}/100
- Best Practices: ${args.metrics.bestPractices}/100
- SEO: ${args.metrics.seo}/100
- Load Time: ${args.metrics.loadTime}
- FCP: ${args.metrics.firstContentfulPaint}
- LCP: ${args.metrics.largestContentfulPaint}
- TBT: ${args.metrics.totalBlockingTime}
- CLS: ${args.metrics.cumulativeLayoutShift}
- Metrics source: ${args.metricsSource || "unknown"}

Design signals:
- Fonts detected: ${args.designSignals.fontsDetected.join(", ") || "unknown"}
- Colors sampled: ${args.designSignals.colorPalette.join(", ") || "unknown"}
- Images missing alt: ${args.designSignals.imagesWithoutAlt}
- External scripts: ${args.designSignals.externalScriptCount}
- Link count: ${args.designSignals.linkCount}
- Broken links sampled: ${args.designSignals.brokenLinks}
- HTML bytes: ${args.designSignals.htmlBytes || 0}
- Initial fetch latency ms: ${args.designSignals.fetchTimeMs || 0}
- Signal warnings: ${(args.designSignals.signalWarnings || []).join(", ") || "none"}${contentSection}`;
}

async function callGroqStructured(args: {
  prompt: string;
  screenshot?: string;
  creativity: number;
}) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  type CompletionArgs = Parameters<typeof groq.chat.completions.create>[0];

  if (args.screenshot) {
    try {
      await incrementCounter("api:groq");
      const visionCompletion = await groq.chat.completions.create({
        model: "llama-3.2-90b-vision-preview",
        stream: false,
        temperature: args.creativity,
        top_p: 0.92,
        max_tokens: 900,
        messages: [
          { role: "system", content: ROAST_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: args.prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${args.screenshot}`
                }
              }
            ]
          }
        ]
      } as CompletionArgs);

      const visionContent =
        "choices" in visionCompletion
          ? toTextContent(visionCompletion.choices[0]?.message?.content)
          : "";

      if (visionContent) {
        return visionContent;
      }
    } catch (visionError) {
      console.warn("[Roast] Vision model fallback:", visionError);
    }
  }

  await incrementCounter("api:groq");
  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    stream: false,
    temperature: args.creativity,
    top_p: 0.92,
    max_tokens: 900,
    messages: [
      { role: "system", content: ROAST_SYSTEM_PROMPT },
      {
        role: "user",
        content: args.prompt
      }
    ]
  });

  return "choices" in completion ? toTextContent(completion.choices[0]?.message?.content) : "";
}

function fallbackStructured(args: {
  url: string;
  metrics: RoastMetrics;
  styleProfile: RoastStyleProfile;
  designSignals: RoastDesignSignals;
  roastMode: RoastMode;
  contentSignals?: FirecrawlSignals;
}): StructuredRoast {
  const host = new URL(args.url).hostname;
  const evidence = buildDefaultEvidence(args.metrics, args.designSignals);
  const fixes = buildDefaultFixes(args.metrics, args.designSignals).slice(0, 5);

  if (args.roastMode === "content" && args.contentSignals) {
    return {
      opening: `${host} shipped content with confidence, but the copy deck is leaking conversions.`,
      burns: [
        `SEO looks fragile with title "${args.contentSignals.title || "missing"}" and description "${args.contentSignals.description || "missing"}".`,
        `Heading hierarchy is weak: H1 count ${args.contentSignals.h1Count}, H2 count ${args.contentSignals.h2Count}, total headings ${args.contentSignals.headingCount}.`,
        `${args.contentSignals.brokenLinks} sampled links are broken out of ${args.contentSignals.linkCount}; trust drops instantly when clicks fail.`
      ],
      evidence: evidence.slice(0, 3),
      fixes: [
        {
          title: "Fix title + meta description",
          why: "Keep title in 30-65 chars and description in 110-170 chars for stronger search snippets.",
          effort: "S"
        },
        {
          title: "Repair heading structure",
          why: "Use a single clear H1 and meaningful H2 sections so humans and crawlers can parse intent.",
          effort: "S"
        },
        {
          title: "Clean broken links",
          why: "Broken outbound/internal links hurt both SEO and user trust.",
          effort: "M"
        },
        {
          title: "Strengthen above-the-fold copy",
          why: "Clarify promise + CTA in first screen to improve conversion intent.",
          effort: "M"
        },
        {
          title: "Add alt text to content images",
          why: "Missing image alt text reduces accessibility and relevance signals.",
          effort: "S"
        }
      ],
      closing: "Tighten content foundations and this becomes a growth page instead of a bounce trap."
    };
  }

  return {
    opening: `${host} entered the arena with ${args.styleProfile.name.toLowerCase()} energy, but the fundamentals still need work.`,
    burns: [
      `Performance is ${args.metrics.performance}/100 and load time is ${args.metrics.loadTime}; users feel that delay instantly.`,
      `${args.designSignals.externalScriptCount} external scripts and ${args.designSignals.fontsDetected.length} fonts make the page look and run heavier than needed.`,
      `Accessibility sits at ${args.metrics.accessibility}/100 with ${args.designSignals.imagesWithoutAlt} missing alt tags, so the experience is not consistent for all users.`
    ],
    evidence: evidence.slice(0, 3),
    fixes,
    closing: "Tighten these core issues and this roast turns into a clean performance story."
  };
}

async function generateRoast(args: {
  url: string;
  screenshot?: string;
  screenshotCaptureError?: string;
  metrics: RoastMetrics;
  metricsSource?: MetricsSource;
  designSignals: RoastDesignSignals;
  styleProfile: RoastStyleProfile;
  roastMode: RoastMode;
  contentSignals?: FirecrawlSignals;
}) {
  const creativity = clamp(0.87 + (Math.random() * 0.12 - 0.04), 0.8, 0.98);

  if (!process.env.GROQ_API_KEY || !ROAST_V11_ENABLED) {
    const structured = fallbackStructured(args);
    return {
      structured,
      roastText: composeRoastText(structured),
      regeneratedOpening: false
    };
  }

  const domain = new URL(args.url).hostname.replace(/^www\./, "");
  const existingOpeners = await readRecentOpeners(domain);

  const runGeneration = async (blockedPhrases: string[]) => {
    const prompt = buildPrompt({
      url: args.url,
      metrics: args.metrics,
      metricsSource: args.metricsSource,
      designSignals: args.designSignals,
      styleProfile: args.styleProfile,
      roastMode: args.roastMode,
      contentSignals: args.contentSignals,
      blockedPhrases
    });

    const raw = await callGroqStructured({
      prompt,
      screenshot: args.screenshot,
      creativity
    });

    const parsed = extractJsonObject(raw || "");
    try {
      const structuredJson = JSON.parse(parsed);
      return sanitizeStructured(structuredJson, args.metrics, args.designSignals);
    } catch {
      return sanitizeStructured({}, args.metrics, args.designSignals);
    }
  };

  let structured: StructuredRoast;
  let regeneratedOpening = false;

  try {
    structured = await runGeneration([]);
  } catch {
    structured = fallbackStructured(args);
  }

  const tooSimilar = existingOpeners.some(
    (oldOpening) => similarity(oldOpening, structured.opening) > 0.75
  );

  if (tooSimilar) {
    try {
      structured = await runGeneration([structured.opening, ...existingOpeners.slice(0, 2)]);
      regeneratedOpening = true;
    } catch {
      // keep first version
    }
  }

  await writeRecentOpeners(domain, structured.opening);

  return {
    structured,
    roastText: composeRoastText(structured),
    regeneratedOpening
  };
}

function metricsSourceLabel(source?: MetricsSource) {
  if (source === "firecrawl") {
    return "Firecrawl";
  }
  if (source === "pagespeed") {
    return "Live";
  }
  if (source === "cached") {
    return "Cached";
  }
  return "Estimated";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const startedAt = Date.now();

  try {
    const url = parseAndValidateUrl(req.body?.url);
    const personaInput = parsePersona(req.body?.persona);
    const roastModeInput = parseRoastMode(req.body?.roastMode);
    const styleProfile = resolvePersona(personaInput);
    const auth = await resolveAuthContext(req);
    if (!auth.isAuthenticated || !auth.userId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Login required to roast websites."
      });
    }

    const admin = isAdminEmail(auth.user?.email || null);
    const userStatus = admin ? "pro" : PRO_TIER_ENABLED ? auth.userStatus : "free";
    const rate = await consumeDailyUsage(userStatus, auth.userId);

    if (!rate.allowed) {
      if (userStatus === "waitlist") {
        return res.status(403).json({
          error: "Waitlist pending",
          message:
            "Unlimited unlock is pending approval. You will be able to roast again once Pro is approved.",
          userStatus,
          dailyLimit: rate.dailyLimit,
          usedToday: rate.usedToday,
          remaining: rate.remaining
        });
      }

      console.info(
        "[Telemetry][RoastLimit]",
        JSON.stringify({
          userStatus,
          userId: auth.userId,
          usedToday: rate.usedToday,
          dailyLimit: rate.dailyLimit
        })
      );

      return res.status(429).json({
        error: "Rate limit exceeded.",
        message: "2/2 used! Join Pro waitlist for unlimited access.",
        userStatus,
        dailyLimit: rate.dailyLimit,
        usedToday: rate.usedToday,
        remaining: rate.remaining
      });
    }

    const roastMode: RoastMode =
      userStatus === "free"
        ? rate.usedToday === 1
          ? "content"
          : "design"
        : roastModeInput === "content" || roastModeInput === "design"
          ? roastModeInput
          : "design";
    let effectiveRoastMode: RoastMode = roastMode;
    let firecrawlCalls = 0;
    const groqCalls = process.env.GROQ_API_KEY && ROAST_V11_ENABLED ? 1 : 0;

    await incrementCounter("api:roast");
    let analysis: {
      metrics: RoastMetrics;
      metricsSource: MetricsSource;
      designSignals: RoastDesignSignals;
    };
    let screenshot: string | undefined;
    let screenshotCaptureError: string | undefined;
    let contentSignals: FirecrawlSignals | undefined;

    if (roastMode === "content") {
      await incrementCounter("api:firecrawl");
      firecrawlCalls = 1;
      await incrementCounter("api:screenshot");
      const [firecrawlResult, analysisResult, screenshotResult] = await Promise.allSettled([
        analyzeContentWithFirecrawl(url),
        analyzeWebsite(url),
        captureWebsiteScreenshot(url)
      ]);

      if (firecrawlResult.status === "fulfilled") {
        contentSignals = firecrawlResult.value.contentSignals;
      } else {
        console.warn("[Roast] Firecrawl unavailable in content mode:", firecrawlResult.reason);
        effectiveRoastMode = "design";
      }

      if (analysisResult.status === "fulfilled") {
        analysis = analysisResult.value as {
          metrics: RoastMetrics;
          metricsSource: MetricsSource;
          designSignals: RoastDesignSignals;
        };
      } else if (firecrawlResult.status === "fulfilled") {
        analysis = {
          metrics: firecrawlResult.value.metrics,
          metricsSource: firecrawlResult.value.metricsSource,
          designSignals: firecrawlResult.value.designSignals
        };
      } else {
        throw analysisResult.reason;
      }

      if (screenshotResult.status === "fulfilled") {
        screenshot = screenshotResult.value;
      } else {
        screenshotCaptureError = getErrorMessage(screenshotResult.reason);
        console.warn("[Roast] Screenshot unavailable:", screenshotCaptureError);
      }
    } else {
      await incrementCounter("api:screenshot");
      const [analysisResult, screenshotResult] = await Promise.allSettled([
        analyzeWebsite(url),
        captureWebsiteScreenshot(url)
      ]);

      if (analysisResult.status === "rejected") {
        throw analysisResult.reason;
      }

      analysis = analysisResult.value as {
        metrics: RoastMetrics;
        metricsSource: MetricsSource;
        designSignals: RoastDesignSignals;
      };

      if (screenshotResult.status === "fulfilled") {
        screenshot = screenshotResult.value;
      } else {
        screenshotCaptureError = getErrorMessage(screenshotResult.reason);
        console.warn("[Roast] Screenshot unavailable:", screenshotCaptureError);
      }
    }

    const roastResult = await generateRoast({
      url,
      screenshot,
      screenshotCaptureError,
      metrics: analysis.metrics,
      metricsSource: analysis.metricsSource,
      designSignals: analysis.designSignals,
      styleProfile,
      roastMode: effectiveRoastMode,
      contentSignals
    });

    const scores = calculateScores({
      metrics: analysis.metrics,
      designSignals: analysis.designSignals,
      styleProfile
    });

    const responsePayload = {
      success: true,
      url,
      roast: roastResult.roastText,
      roastMode: effectiveRoastMode,
      metrics: analysis.metrics,
      metricsSource: analysis.metricsSource,
      screenshot: screenshot || "",
      screenshotCaptureError,
      qualityScore: scores.qualityScore,
      severityScore: scores.severityScore,
      roastScore: scores.severityScore,
      personaUsed: styleProfile.key,
      evidence: roastResult.structured.evidence,
      fixes: roastResult.structured.fixes,
      userStatus,
      dailyLimit: rate.dailyLimit,
      usedToday: rate.usedToday,
      remaining: rate.remaining,
      groqCalls,
      firecrawlCalls,
      timestamp: new Date().toISOString()
    };

    if (auth.userId) {
      await appendUserHistory(auth.userId, responsePayload, auth.user?.email);
    }

    const latencyMs = Date.now() - startedAt;
    console.info(
      "[Telemetry][Roast]",
      JSON.stringify({
        url,
        roastMode: effectiveRoastMode,
        userStatus,
        userId: auth.userId,
        metricsSource: analysis.metricsSource,
        metricsSourceLabel: metricsSourceLabel(analysis.metricsSource),
        persona: styleProfile.key,
        qualityScore: scores.qualityScore,
        severityScore: scores.severityScore,
        qualityBucket: Math.floor(scores.qualityScore / 10) * 10,
        regeneratedOpening: roastResult.regeneratedOpening,
        latencyMs
      })
    );

    return res.status(200).json(responsePayload);
  } catch (caught: unknown) {
    const message = caught instanceof Error ? caught.message : String(caught);
    const stack = caught instanceof Error ? caught.stack : "";
    console.error("[Roast Error]:", message, stack);

    if (message.toLowerCase().includes("timed out")) {
      return res.status(504).json({
        error: "Timeout",
        message: "Your website took too long to load (>30s)."
      });
    }

    if (
      message.toLowerCase().includes("valid") ||
      message.toLowerCase().includes("blocked") ||
      message.toLowerCase().includes("url")
    ) {
      return res.status(400).json({
        error: "Invalid URL",
        message
      });
    }

    if (message.toLowerCase().includes("target returned")) {
      return res.status(400).json({
        error: "URL inaccessible",
        message: "Couldn't reach your website. Is it live?"
      });
    }

    if (message.toLowerCase().includes("login required")) {
      return res.status(401).json({
        error: "Unauthorized",
        message
      });
    }

    if (message.toLowerCase().includes("api key")) {
      return res.status(503).json({
        error: "AI unavailable",
        message: "AI is taking a coffee break. Try again in a moment."
      });
    }

    return res.status(500).json({
      error: "Failed to roast website",
      message
    });
  }
}
