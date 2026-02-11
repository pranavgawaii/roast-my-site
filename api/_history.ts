import { getRedis } from "./_rateLimit.js";

const HISTORY_MAX_ITEMS = 50;
const SUPABASE_TABLE = "roast_generations";

interface PersistedHistoryItem {
  success: boolean;
  url: string;
  roast: string;
  roastMode?: "content" | "design";
  metrics: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    loadTime: string;
    firstContentfulPaint: string;
    largestContentfulPaint: string;
    totalBlockingTime: string;
    cumulativeLayoutShift: string;
  };
  metricsSource?: "pagespeed" | "cached" | "estimated" | "firecrawl";
  screenshot: string;
  screenshotCaptureError?: string;
  qualityScore?: number;
  severityScore?: number;
  roastScore: number;
  personaUsed?: "assassin" | "kitchen" | "courtroom" | "sports";
  evidence?: Array<{ label: string; value: string; impact: "high" | "medium" | "low" }>;
  fixes?: Array<{ title: string; why: string; effort: "S" | "M" | "L" }>;
  userStatus?: "anonymous" | "free" | "waitlist" | "pro";
  dailyLimit?: number | null;
  usedToday?: number;
  remaining?: number | null;
  groqCalls?: number;
  firecrawlCalls?: number;
  timestamp: string;
}

interface SupabaseRoastRow {
  id?: string;
  user_id: string;
  user_email?: string | null;
  url: string;
  roast: string;
  roast_mode?: "content" | "design" | null;
  persona_used?: "assassin" | "kitchen" | "courtroom" | "sports" | null;
  metrics_source?: "pagespeed" | "cached" | "estimated" | "firecrawl" | null;
  quality_score?: number | null;
  severity_score?: number | null;
  roast_score?: number | null;
  metrics?: PersistedHistoryItem["metrics"] | null;
  evidence?: PersistedHistoryItem["evidence"] | null;
  fixes?: PersistedHistoryItem["fixes"] | null;
  screenshot_available?: boolean | null;
  screenshot_data?: string | null;
  screenshot_capture_error?: string | null;
  user_status?: "free" | "waitlist" | "pro" | null;
  daily_limit?: number | null;
  used_today?: number | null;
  remaining?: number | null;
  groq_calls?: number | null;
  firecrawl_calls?: number | null;
  created_at?: string | null;
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

function supabaseHeaders(serviceRole: string) {
  return {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    "Content-Type": "application/json"
  };
}

function historyKey(userId: string) {
  return `history:user:${userId}`;
}

function sanitizeItem(item: PersistedHistoryItem): PersistedHistoryItem {
  return {
    ...item,
    screenshot: String(item.screenshot || ""),
    roast: String(item.roast || "").trim(),
    timestamp: item.timestamp || new Date().toISOString()
  };
}

function toSupabaseRow(userId: string, userEmail: string | undefined, item: PersistedHistoryItem) {
  return {
    user_id: userId,
    user_email: userEmail || null,
    url: item.url,
    roast: item.roast,
    roast_mode: item.roastMode || null,
    persona_used: item.personaUsed || null,
    metrics_source: item.metricsSource || null,
    quality_score: item.qualityScore ?? null,
    severity_score: item.severityScore ?? null,
    roast_score: item.roastScore,
    metrics: item.metrics || {},
    evidence: item.evidence || [],
    fixes: item.fixes || [],
    screenshot_available: Boolean(item.screenshot),
    screenshot_data: item.screenshot || null,
    screenshot_capture_error: item.screenshotCaptureError || null,
    user_status:
      item.userStatus === "free" || item.userStatus === "waitlist" || item.userStatus === "pro"
        ? item.userStatus
        : null,
    daily_limit: item.dailyLimit ?? null,
    used_today: item.usedToday ?? null,
    remaining: item.remaining ?? null,
    groq_calls: typeof item.groqCalls === "number" ? item.groqCalls : 0,
    firecrawl_calls: typeof item.firecrawlCalls === "number" ? item.firecrawlCalls : 0,
    created_at: item.timestamp || new Date().toISOString()
  } as SupabaseRoastRow;
}

function rowToHistoryItem(row: SupabaseRoastRow): PersistedHistoryItem {
  const metrics = row.metrics || {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
    loadTime: "n/a",
    firstContentfulPaint: "n/a",
    largestContentfulPaint: "n/a",
    totalBlockingTime: "n/a",
    cumulativeLayoutShift: "n/a"
  };

  return {
    success: true,
    url: String(row.url || ""),
    roast: String(row.roast || "").trim(),
    roastMode: row.roast_mode || undefined,
    metrics,
    metricsSource: row.metrics_source || undefined,
    screenshot: row.screenshot_data || "",
    screenshotCaptureError: row.screenshot_capture_error || undefined,
    qualityScore: row.quality_score ?? undefined,
    severityScore: row.severity_score ?? undefined,
    roastScore:
      typeof row.roast_score === "number"
        ? row.roast_score
        : row.severity_score ?? 0,
    personaUsed: row.persona_used || undefined,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    fixes: Array.isArray(row.fixes) ? row.fixes : [],
    userStatus: row.user_status || undefined,
    dailyLimit: row.daily_limit ?? undefined,
    usedToday: row.used_today ?? undefined,
    remaining: row.remaining ?? undefined,
    groqCalls: row.groq_calls ?? undefined,
    firecrawlCalls: row.firecrawl_calls ?? undefined,
    timestamp: row.created_at || new Date().toISOString()
  };
}

async function appendRedisHistory(userId: string, item: PersistedHistoryItem) {
  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    const key = historyKey(userId);
    await client.lpush(key, item);
    await client.ltrim(key, 0, HISTORY_MAX_ITEMS - 1);
  } catch (err) {
    console.warn("Failed to append user history in Redis:", err);
  }
}

async function appendSupabaseHistory(
  userId: string,
  item: PersistedHistoryItem,
  userEmail?: string
) {
  const config = supabaseConfig();
  if (!config) {
    return false;
  }

  try {
    const response = await fetch(`${config.baseUrl}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(config.serviceRole),
        Prefer: "return=minimal"
      },
      body: JSON.stringify(toSupabaseRow(userId, userEmail, item))
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`Supabase insert failed (${response.status}):`, body.slice(0, 200));
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Supabase insert failed:", err);
    return false;
  }
}

async function readSupabaseHistory(userId: string, limit: number) {
  const config = supabaseConfig();
  if (!config) {
    return null as PersistedHistoryItem[] | null;
  }

  try {
    const query = new URLSearchParams({
      select:
        "url,roast,roast_mode,persona_used,metrics_source,quality_score,severity_score,roast_score,metrics,evidence,fixes,screenshot_data,screenshot_capture_error,user_status,daily_limit,used_today,remaining,groq_calls,firecrawl_calls,created_at",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
      limit: String(limit)
    });

    const response = await fetch(`${config.baseUrl}/rest/v1/${SUPABASE_TABLE}?${query.toString()}`, {
      method: "GET",
      headers: supabaseHeaders(config.serviceRole)
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(`Supabase history read failed (${response.status}):`, body.slice(0, 200));
      return null;
    }

    const rows = (await response.json()) as SupabaseRoastRow[];
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .filter((row) => row && typeof row === "object")
      .map((row) => rowToHistoryItem(row));
  } catch (err) {
    console.warn("Supabase history read failed:", err);
    return null;
  }
}

export async function appendUserHistory(
  userId: string,
  item: PersistedHistoryItem,
  userEmail?: string
) {
  const payload = sanitizeItem(item);
  await appendSupabaseHistory(userId, payload, userEmail);
  await appendRedisHistory(userId, payload);
}

export async function getUserHistory(userId: string, limit = 20) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const supabaseRows = await readSupabaseHistory(userId, safeLimit);
  if (supabaseRows && supabaseRows.length) {
    return supabaseRows;
  }

  const client = getRedis();
  if (!client) {
    return [] as PersistedHistoryItem[];
  }

  try {
    const key = historyKey(userId);
    const rows = await client.lrange<PersistedHistoryItem>(key, 0, safeLimit - 1);
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows
      .filter((row) => row && typeof row === "object")
      .map((row) => ({
        ...row,
        screenshot: String(row.screenshot || ""),
        timestamp: row.timestamp || new Date().toISOString()
      }));
  } catch (err) {
    console.warn("Failed to read user history:", err);
    return [];
  }
}
