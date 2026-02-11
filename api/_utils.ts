import type { VercelRequest } from "@vercel/node";

const BLOCKED_KEYWORDS = [
  "adult",
  "porn",
  "xxx",
  "sexcam",
  "casino",
  "betting",
  "spam"
];
const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal"
]);

const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./
];

const PRIVATE_IPV6 = [/^::1$/i, /^fc/i, /^fd/i, /^fe80:/i];

export function getClientIp(req: VercelRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

export function parseAndValidateUrl(input: string) {
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("URL is required.");
  }

  let candidate = raw;
  if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http:// and https:// URLs are allowed.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".")) {
    throw new Error("Please use a valid domain.");
  }

  if (BLOCKED_KEYWORDS.some((keyword) => host.includes(keyword))) {
    throw new Error("This domain is blocked.");
  }

  if (BLOCKED_HOSTS.has(host)) {
    throw new Error("Localhost/private hosts are blocked.");
  }

  if (PRIVATE_IPV4.some((pattern) => pattern.test(host))) {
    throw new Error("Private IP ranges are blocked.");
  }

  if (PRIVATE_IPV6.some((pattern) => pattern.test(host))) {
    throw new Error("Private IPv6 ranges are blocked.");
  }

  return parsed.toString();
}

export async function checkReachable(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal
    });

    if (response.status === 405 || response.status >= 500) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal
      });
    }

    if (!response.ok) {
      throw new Error(`Target returned ${response.status}`);
    }

    parseAndValidateUrl(response.url || url);

    return true;
  } finally {
    clearTimeout(timeout);
  }
}

export function isJsonRequest(req: VercelRequest) {
  return req.headers["content-type"]?.includes("application/json");
}
