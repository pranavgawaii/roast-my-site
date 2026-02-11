import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { analyzeWebsite } from "../api/analyze.ts";
import { restoreEnv, snapshotEnv } from "./helpers/env.ts";

let envSnapshot: NodeJS.ProcessEnv;
let originalFetch: typeof global.fetch;

beforeEach(() => {
  envSnapshot = snapshotEnv();
  originalFetch = global.fetch;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.PAGESPEED_API_KEY;
});

afterEach(() => {
  global.fetch = originalFetch;
  restoreEnv(envSnapshot);
});

test("analyzeWebsite uses estimated metrics when PageSpeed is rate-limited", async () => {
  const html = `
    <html>
      <head>
        <style>body { font-family: Inter, sans-serif; color: #111111; }</style>
      </head>
      <body>
        <h1>RoastMySite</h1>
        <img src="/hero.jpg" />
        <script src="https://cdn.example.com/app.js"></script>
      </body>
    </html>
  `;

  global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (rawUrl.startsWith("https://www.googleapis.com/pagespeedonline/")) {
      return new Response("{}", { status: 429 });
    }

    if (rawUrl === "https://example.com/" || rawUrl === "https://example.com") {
      if (init?.method === "HEAD") {
        return new Response("", { status: 200 });
      }
      return new Response(html, { status: 200 });
    }

    return new Response("", { status: 200 });
  };

  const result = await analyzeWebsite("https://example.com/");
  assert.equal(result.metricsSource, "estimated");
  assert.ok(result.metrics.performance > 0);
  assert.ok(result.designSignals.externalScriptCount >= 1);
  assert.ok(result.designSignals.imagesWithoutAlt >= 1);
});

test("analyzeWebsite uses live PageSpeed metrics when available", async () => {
  const pageSpeedResponse = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.81 },
        accessibility: { score: 0.92 },
        seo: { score: 0.88 },
        "best-practices": { score: 0.76 }
      },
      audits: {
        "speed-index": { displayValue: "2.9 s" },
        "first-contentful-paint": { displayValue: "1.2 s" },
        "largest-contentful-paint": { displayValue: "2.5 s" },
        "total-blocking-time": { displayValue: "40 ms" },
        "cumulative-layout-shift": { displayValue: "0.02" }
      }
    }
  };

  global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (rawUrl.startsWith("https://www.googleapis.com/pagespeedonline/")) {
      return new Response(JSON.stringify(pageSpeedResponse), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (rawUrl === "https://vercel.com/" || rawUrl === "https://vercel.com") {
      if (init?.method === "HEAD") {
        return new Response("", { status: 200 });
      }
      return new Response("<html><body><h1>Vercel</h1></body></html>", { status: 200 });
    }

    return new Response("", { status: 200 });
  };

  const result = await analyzeWebsite("https://vercel.com/");
  assert.equal(result.metricsSource, "pagespeed");
  assert.equal(result.metrics.performance, 81);
  assert.equal(result.metrics.accessibility, 92);
  assert.equal(result.metrics.bestPractices, 76);
  assert.equal(result.metrics.seo, 88);
});
