import type { ScoreBand } from "../types";

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "192.168."
];

const BLOCKED_KEYWORDS = [
  "adult",
  "porn",
  "xxx",
  "sexcam",
  "casino",
  "betting",
  "spam"
];

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function normalizeUrl(input: string) {
  let value = input.trim();

  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = `https://${value}`;
  }

  return value;
}

export function validateUrl(input: string) {
  if (!input.trim()) {
    return "Please enter a URL.";
  }

  const normalized = normalizeUrl(input);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return "That doesn't look like a valid URL.";
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return "URL must start with http:// or https://";
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.some((entry) => host === entry || host.startsWith(entry))) {
    return "Local or private network URLs are blocked.";
  }

  if (BLOCKED_KEYWORDS.some((keyword) => host.includes(keyword))) {
    return "This domain is blocked for safety.";
  }

  if (!host.includes(".")) {
    return "Please use a full domain (example.com).";
  }

  return null;
}

export function getScoreBand(score: number): ScoreBand {
  if (score <= 50) {
    return "terrible";
  }
  if (score <= 70) {
    return "warning";
  }
  if (score <= 85) {
    return "decent";
  }
  return "great";
}

export function scoreColor(score: number) {
  const band = getScoreBand(score);
  if (band === "terrible") {
    return "text-ember-600";
  }
  if (band === "warning") {
    return "text-ember-500";
  }
  if (band === "decent") {
    return "text-ember-400";
  }
  return "text-ember-300";
}

export function metricColor(score: number) {
  const band = getScoreBand(score);
  if (band === "terrible") {
    return "bg-ember-700";
  }
  if (band === "warning") {
    return "bg-ember-500";
  }
  if (band === "decent") {
    return "bg-ember-400";
  }
  return "bg-ember-300";
}

export function cleanDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function roastFire(score: number) {
  if (score < 35) {
    return "🔥🔥🔥🔥🔥";
  }
  if (score < 55) {
    return "🔥🔥🔥🔥";
  }
  if (score < 75) {
    return "🔥🔥🔥";
  }
  if (score < 90) {
    return "🔥🔥";
  }
  return "🔥";
}

export function excerpt(text: string, length = 130) {
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length).trim()}...`;
}
