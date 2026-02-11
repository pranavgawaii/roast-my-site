import { Redis } from "@upstash/redis";
import type { UserStatus } from "./_auth";

const RATE_TTL_SECONDS = 60 * 60 * 48;

const DAILY_LIMITS: Record<UserStatus, number | null> = {
  anonymous: 0,
  free: 2,
  waitlist: 0,
  pro: null
};

const inMemoryUsage = new Map<string, { value: number; expiresAt: number }>();
let redis: Redis | null = null;

export interface UsageSnapshot {
  dailyLimit: number | null;
  usedToday: number;
  remaining: number | null;
}

export interface UsageDecision extends UsageSnapshot {
  allowed: boolean;
  reason?: "waitlist_pending" | "daily_limit_reached";
}

export function getRedis() {
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

function normalizeIdentifier(identifier: string) {
  return identifier?.trim() || "unknown";
}

export function currentIstDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  const day = parts.find((part) => part.type === "day")?.value || "00";
  return `${year}${month}${day}`;
}

function usageKey(status: UserStatus, identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  const prefix = status === "anonymous" ? "usage:anon" : "usage:user";
  return `${prefix}:${normalized}:${currentIstDateKey()}`;
}

function safeRemaining(dailyLimit: number | null, usedToday: number) {
  if (dailyLimit === null) {
    return null;
  }
  return Math.max(0, dailyLimit - usedToday);
}

function cleanupMemory(key: string) {
  const current = inMemoryUsage.get(key);
  if (!current) {
    return;
  }
  if (current.expiresAt <= Date.now()) {
    inMemoryUsage.delete(key);
  }
}

function getMemoryUsage(key: string) {
  cleanupMemory(key);
  return inMemoryUsage.get(key)?.value || 0;
}

function incrMemoryUsage(key: string) {
  cleanupMemory(key);
  const current = inMemoryUsage.get(key)?.value || 0;
  const next = current + 1;
  inMemoryUsage.set(key, {
    value: next,
    expiresAt: Date.now() + RATE_TTL_SECONDS * 1000
  });
  return next;
}

export function getDailyLimit(status: UserStatus) {
  return DAILY_LIMITS[status];
}

export async function getUsageSnapshot(
  status: UserStatus,
  identifier: string
): Promise<UsageSnapshot> {
  const dailyLimit = getDailyLimit(status);

  if (status === "waitlist") {
    return {
      dailyLimit,
      usedToday: 0,
      remaining: 0
    };
  }

  const key = usageKey(status, identifier);
  const client = getRedis();
  let usedToday = 0;

  if (client) {
    try {
      const raw = await client.get<number>(key);
      usedToday = Number(raw || 0);
    } catch (err) {
      console.warn("Usage snapshot Redis read failed:", err);
      usedToday = getMemoryUsage(key);
    }
  } else {
    usedToday = getMemoryUsage(key);
  }

  return {
    dailyLimit,
    usedToday,
    remaining: safeRemaining(dailyLimit, usedToday)
  };
}

export async function consumeDailyUsage(
  status: UserStatus,
  identifier: string
): Promise<UsageDecision> {
  const dailyLimit = getDailyLimit(status);

  if (status === "waitlist") {
    return {
      allowed: false,
      reason: "waitlist_pending",
      dailyLimit,
      usedToday: 0,
      remaining: 0
    };
  }

  const key = usageKey(status, identifier);
  const client = getRedis();

  if (client) {
    try {
      const currentRaw = await client.get<number>(key);
      const current = Number(currentRaw || 0);

      if (dailyLimit !== null && current >= dailyLimit) {
        return {
          allowed: false,
          reason: "daily_limit_reached",
          dailyLimit,
          usedToday: current,
          remaining: 0
        };
      }

      const next = await client.incr(key);
      if (next === 1) {
        await client.expire(key, RATE_TTL_SECONDS);
      }

      return {
        allowed: true,
        dailyLimit,
        usedToday: next,
        remaining: safeRemaining(dailyLimit, next)
      };
    } catch (err) {
      console.warn("Usage consume Redis failed, using memory fallback:", err);
    }
  }

  const memoryCurrent = getMemoryUsage(key);
  if (dailyLimit !== null && memoryCurrent >= dailyLimit) {
    return {
      allowed: false,
      reason: "daily_limit_reached",
      dailyLimit,
      usedToday: memoryCurrent,
      remaining: 0
    };
  }

  const memoryNext = incrMemoryUsage(key);
  return {
    allowed: true,
    dailyLimit,
    usedToday: memoryNext,
    remaining: safeRemaining(dailyLimit, memoryNext)
  };
}
