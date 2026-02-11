import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  deriveUserStatusFromMetadata,
  isAdminEmail,
  isAdminAuth,
  listClerkUsers,
  resolveAuthContext
} from "./_auth.js";
import { currentIstDateKey, getRedis } from "./_rateLimit.js";

function parseLimit(raw: unknown, fallback = 100, max = 200) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value || fallback);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value || fallback);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function supabaseConfig() {
  const baseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (
    !baseUrl ||
    !serviceRole ||
    baseUrl.includes("your-project") ||
    serviceRole.includes("your_service_role")
  ) {
    return null;
  }
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    serviceRole
  };
}

function istDayRangeUtc(now = new Date()) {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const datePart = dateFmt.format(now);
  const start = new Date(`${datePart}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

async function readSupabaseDailyUsage() {
  const config = supabaseConfig();
  if (!config) {
    return null as
      | {
        totalRoasts: number;
        groqCalls: number;
        firecrawlCalls: number;
      }
      | null;
  }

  const { startIso, endIso } = istDayRangeUtc();
  const fetchRows = async (select: string) => {
    const query = new URLSearchParams();
    query.set("select", select);
    query.append("created_at", `gte.${startIso}`);
    query.append("created_at", `lt.${endIso}`);
    query.set("order", "created_at.desc");
    query.set("limit", "5000");

    const response = await fetch(
      `${config.baseUrl}/rest/v1/roast_generations?${query.toString()}`,
      {
        method: "GET",
        headers: {
          apikey: config.serviceRole,
          Authorization: `Bearer ${config.serviceRole}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const body = await response.text();
      return { ok: false as const, status: response.status, body };
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;
    return { ok: true as const, rows: Array.isArray(rows) ? rows : [] };
  };

  try {
    const primary = await fetchRows(
      "id,groq_calls,firecrawl_calls,metrics_source,roast_mode"
    );

    if (primary.ok) {
      const totalRoasts = primary.rows.length;
      let groqCalls = primary.rows.reduce(
        (sum, row) => sum + Number(row.groq_calls || 0),
        0
      );
      let firecrawlCalls = primary.rows.reduce(
        (sum, row) => sum + Number(row.firecrawl_calls || 0),
        0
      );

      // Backward compatibility for rows created before usage columns existed.
      if (groqCalls <= 0 && totalRoasts > 0) {
        groqCalls = totalRoasts;
      }
      if (firecrawlCalls <= 0 && totalRoasts > 0) {
        firecrawlCalls = primary.rows.filter((row) => {
          const source = String(row.metrics_source || "").toLowerCase();
          const mode = String(row.roast_mode || "").toLowerCase();
          return source === "firecrawl" || mode === "content";
        }).length;
      }

      return {
        totalRoasts,
        groqCalls,
        firecrawlCalls
      };
    }

    // Fallback when new usage columns are not present yet in existing tables.
    const fallback = await fetchRows("id,metrics_source,roast_mode");
    if (fallback.ok) {
      const totalRoasts = fallback.rows.length;
      const firecrawlCalls = fallback.rows.filter((row) => {
        const source = String(row.metrics_source || "").toLowerCase();
        const mode = String(row.roast_mode || "").toLowerCase();
        return source === "firecrawl" || mode === "content";
      }).length;

      return {
        totalRoasts,
        groqCalls: totalRoasts,
        firecrawlCalls
      };
    }

    console.warn(
      `Supabase daily usage read failed (${primary.status}):`,
      primary.body.slice(0, 200)
    );
    return null;
  } catch (err) {
    console.warn("Supabase daily usage read failed:", err);
    return null;
  }
}

function sumUsageRows(rows: Array<Record<string, unknown>>) {
  const totalRoasts = rows.length;
  let groqCalls = rows.reduce((sum, row) => sum + Number(row.groq_calls || 0), 0);
  let firecrawlCalls = rows.reduce((sum, row) => sum + Number(row.firecrawl_calls || 0), 0);

  if (groqCalls <= 0 && totalRoasts > 0) {
    groqCalls = totalRoasts;
  }
  if (firecrawlCalls <= 0 && totalRoasts > 0) {
    firecrawlCalls = rows.filter((row) => {
      const source = String(row.metrics_source || "").toLowerCase();
      const mode = String(row.roast_mode || "").toLowerCase();
      return source === "firecrawl" || mode === "content";
    }).length;
  }

  return { totalRoasts, groqCalls, firecrawlCalls };
}

async function readSupabaseTotalUsage() {
  const config = supabaseConfig();
  if (!config) {
    return null as
      | {
        totalRoasts: number;
        groqCalls: number;
        firecrawlCalls: number;
      }
      | null;
  }

  const query = new URLSearchParams({
    select: "id,groq_calls,firecrawl_calls,metrics_source,roast_mode",
    order: "created_at.desc",
    limit: "20000"
  });

  try {
    const response = await fetch(
      `${config.baseUrl}/rest/v1/roast_generations?${query.toString()}`,
      {
        method: "GET",
        headers: {
          apikey: config.serviceRole,
          Authorization: `Bearer ${config.serviceRole}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.warn(`Supabase total usage read failed (${response.status}):`, body.slice(0, 200));
      return null;
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(rows)) {
      return { totalRoasts: 0, groqCalls: 0, firecrawlCalls: 0 };
    }

    return sumUsageRows(rows);
  } catch (err) {
    console.warn("Supabase total usage read failed:", err);
    return null;
  }
}

async function scanKeys(match: string) {
  const client = getRedis();
  if (!client) {
    return [] as string[];
  }

  const keys: string[] = [];
  let cursor: string | number = "0";
  let loops = 0;

  do {
    const [nextCursor, batch] = await client.scan(cursor, {
      match,
      count: 300
    });
    keys.push(...batch);
    cursor = nextCursor;
    loops += 1;
  } while (String(cursor) !== "0" && loops < 80);

  return Array.from(new Set(keys));
}

async function readNumber(key: string) {
  const client = getRedis();
  if (!client) {
    return 0;
  }

  try {
    const value = await client.get<number>(key);
    return Number(value || 0);
  } catch {
    return 0;
  }
}

async function readHistoryCount(userId: string) {
  const client = getRedis();
  if (!client) {
    return 0;
  }

  try {
    return await client.llen(`history:user:${userId}`);
  } catch {
    return 0;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const auth = await resolveAuthContext(req);
    if (!isAdminAuth(auth)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin access required."
      });
    }

    const limit = parseLimit(req.query?.limit, 100, 200);
    const key = currentIstDateKey();
    const users = await listClerkUsers({ limit: Math.min(limit, 100), maxPages: 4 });

    const userUsageKeys = await scanKeys(`usage:user:*:${key}`);
    const anonUsageKeys = await scanKeys(`usage:anon:*:${key}`);

    const usageByUser = new Map<string, number>();
    for (const usageKey of userUsageKeys) {
      const parts = usageKey.split(":");
      const userId = parts[2];
      if (!userId) {
        continue;
      }
      const used = await readNumber(usageKey);
      usageByUser.set(userId, used);
    }

    let anonymousRoastsToday = 0;
    for (const usageKey of anonUsageKeys) {
      anonymousRoastsToday += await readNumber(usageKey);
    }

    const apiCounters = {
      roastRequests: await readNumber(`counter:api:roast:${key}`),
      groqCalls: await readNumber(`counter:api:groq:${key}`),
      screenshotAttempts: await readNumber(`counter:api:screenshot:${key}`),
      firecrawlCalls: await readNumber(`counter:api:firecrawl:${key}`),
      pageSpeedLive: await readNumber(`counter:api:pagespeed_live:${key}`),
      pageSpeedCached: await readNumber(`counter:api:pagespeed_cached:${key}`),
      pageSpeedEstimated: await readNumber(`counter:api:pagespeed_estimated:${key}`)
    };

    const normalizedUsers = await Promise.all(
      users.slice(0, limit).map(async (user) => {
        const basePlan = deriveUserStatusFromMetadata(user.publicMetadata || {});
        const admin = isAdminEmail(user.email || null);
        const plan = {
          userStatus: admin ? "pro" : basePlan.userStatus,
          waitlistStatus: admin ? "approved" : basePlan.waitlistStatus,
          proApproved: admin ? true : basePlan.proApproved
        } as const;
        const usedToday = usageByUser.get(user.id) || 0;
        const historyCount = await readHistoryCount(user.id);
        return {
          userId: user.id,
          email: user.email || "no-email",
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
            user.username ||
            "Unknown",
          userStatus: plan.userStatus,
          waitlistStatus: plan.waitlistStatus,
          proApproved: plan.proApproved,
          usedToday,
          historyCount,
          createdAt: user.createdAt || null,
          lastSignInAt: user.lastSignInAt || null
        };
      })
    );

    const totalUsers = normalizedUsers.length;
    const proUsers = normalizedUsers.filter((user) => user.userStatus === "pro").length;
    const waitlistPending = normalizedUsers.filter(
      (user) => user.waitlistStatus === "pending"
    ).length;
    const waitlistDenied = normalizedUsers.filter(
      (user) => user.waitlistStatus === "denied"
    ).length;
    const freeUsers = normalizedUsers.filter((user) => user.userStatus === "free").length;
    let authenticatedRoastsToday = Array.from(usageByUser.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    let totalRoastsToday = authenticatedRoastsToday + anonymousRoastsToday;
    const supabaseDaily = await readSupabaseDailyUsage();
    if (supabaseDaily) {
      apiCounters.groqCalls = supabaseDaily.groqCalls;
      apiCounters.firecrawlCalls = supabaseDaily.firecrawlCalls;
      apiCounters.roastRequests =
        supabaseDaily.totalRoasts > 0 ? supabaseDaily.totalRoasts : apiCounters.roastRequests;
      authenticatedRoastsToday = supabaseDaily.totalRoasts;
      totalRoastsToday = supabaseDaily.totalRoasts;
    }
    const groqDailyLimit = parsePositiveInt(process.env.GROQ_DAILY_LIMIT, 14400);
    const firecrawlDailyLimit = parsePositiveInt(process.env.FIRECRAWL_DAILY_LIMIT, 500);
    const supabaseTotal = await readSupabaseTotalUsage();

    const creditUsage = {
      groq: {
        usedToday: apiCounters.groqCalls,
        dailyLimit: groqDailyLimit,
        remaining: Math.max(0, groqDailyLimit - apiCounters.groqCalls),
        usagePercent: Math.min(100, Math.round((apiCounters.groqCalls / groqDailyLimit) * 100)),
        totalUsed: supabaseTotal?.groqCalls ?? apiCounters.groqCalls
      },
      firecrawl: {
        usedToday: apiCounters.firecrawlCalls,
        dailyLimit: firecrawlDailyLimit,
        remaining: Math.max(0, firecrawlDailyLimit - apiCounters.firecrawlCalls),
        usagePercent: Math.min(
          100,
          Math.round((apiCounters.firecrawlCalls / firecrawlDailyLimit) * 100)
        ),
        totalUsed: supabaseTotal?.firecrawlCalls ?? apiCounters.firecrawlCalls
      }
    };

    const topUsers = [...normalizedUsers]
      .sort((a, b) => b.usedToday - a.usedToday)
      .slice(0, 10)
      .map((user) => ({
        userId: user.userId,
        email: user.email,
        usedToday: user.usedToday,
        userStatus: user.userStatus
      }));

    console.info(
      "[Telemetry][AdminOverview]",
      JSON.stringify({
        adminUserId: auth.userId,
        totalUsers,
        totalRoastsToday
      })
    );

    return res.status(200).json({
      success: true,
      dateKey: key,
      summary: {
        totalUsers,
        freeUsers,
        proUsers,
        waitlistPending,
        waitlistDenied,
        activeAuthenticatedUsersToday: usageByUser.size,
        activeAnonymousIpsToday: anonUsageKeys.length,
        authenticatedRoastsToday,
        anonymousRoastsToday,
        totalRoastsToday
      },
      apiUsage: apiCounters,
      creditUsage,
      keyHealth: {
        groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
        firecrawlKeyConfigured: Boolean(process.env.FIRECRAWL_API_KEY),
        pageSpeedKeyConfigured: Boolean(process.env.PAGESPEED_API_KEY),
        supabaseConfigured: Boolean(
          process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ),
        redisConfigured: Boolean(
          process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ),
        clerkSecretConfigured: Boolean(process.env.CLERK_SECRET_KEY)
      },
      topUsers,
      users: normalizedUsers.sort((a, b) => b.usedToday - a.usedToday)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load admin overview.";
    return res.status(500).json({ error: "Admin overview failed", message });
  }
}
