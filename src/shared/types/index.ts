export type ScoreBand = "terrible" | "warning" | "decent" | "great";
export type MetricsSource = "pagespeed" | "cached" | "estimated" | "firecrawl";
export type RoastPersona = "assassin" | "kitchen" | "courtroom" | "sports";
export type PersonaOption = RoastPersona | "auto";
export type RoastMode = "content" | "design";
export type EvidenceImpact = "high" | "medium" | "low";
export type FixEffort = "S" | "M" | "L";
export type ShareCardTheme =
  | "websiteDark"
  | "noirDark"
  | "midnightDark"
  | "ivoryLight"
  | "frostLight";
export type UserStatus = "anonymous" | "free" | "waitlist" | "pro";
export type WaitlistStatus = "none" | "pending" | "approved" | "denied";

export interface PerformanceMetrics {
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

export interface RoastEvidence {
  label: string;
  value: string;
  impact: EvidenceImpact;
}

export interface RoastFix {
  title: string;
  why: string;
  effort: FixEffort;
}

export interface RoastResult {
  success: boolean;
  roast: string;
  roastMode?: RoastMode;
  metrics: PerformanceMetrics;
  metricsSource?: MetricsSource;
  screenshot: string;
  screenshotCaptureError?: string;
  qualityScore?: number;
  severityScore?: number;
  personaUsed?: RoastPersona;
  evidence?: RoastEvidence[];
  fixes?: RoastFix[];
  userStatus?: UserStatus;
  dailyLimit?: number | null;
  usedToday?: number;
  groqCalls?: number;
  firecrawlCalls?: number;
  roastScore: number; // Deprecated: kept for backward compatibility.
  url: string;
  remaining?: number | null;
  timestamp: string;
}

export interface RoastApiError {
  error: string;
  message?: string;
  roastMode?: RoastMode;
  remaining?: number | null;
  userStatus?: UserStatus;
  dailyLimit?: number | null;
  usedToday?: number;
}

export interface ExampleRoast {
  site: string;
  score: number;
  excerpt: string;
}

export interface AccountStatusResponse {
  success: boolean;
  userStatus: UserStatus;
  dailyLimit: number | null;
  usedToday: number;
  remaining: number | null;
  proApproved: boolean;
  waitlistStatus: WaitlistStatus;
  userId?: string;
}

export interface RoastHistoryResponse {
  success: boolean;
  history: RoastResult[];
}

export interface ProWaitlistResponse {
  success: boolean;
  userStatus: UserStatus;
  waitlistStatus: WaitlistStatus;
  message: string;
}

export interface AdminUserRow {
  userId: string;
  email: string;
  name: string;
  userStatus: UserStatus;
  waitlistStatus: WaitlistStatus;
  proApproved: boolean;
  usedToday: number;
  historyCount: number;
  createdAt: number | null;
  lastSignInAt: number | null;
}

export interface AdminOverviewResponse {
  success: boolean;
  dateKey: string;
  summary: {
    totalUsers: number;
    freeUsers: number;
    proUsers: number;
    waitlistPending: number;
    waitlistDenied: number;
    activeAuthenticatedUsersToday: number;
    activeAnonymousIpsToday: number;
    authenticatedRoastsToday: number;
    anonymousRoastsToday: number;
    totalRoastsToday: number;
  };
  apiUsage: {
    roastRequests: number;
    groqCalls: number;
    screenshotAttempts: number;
    firecrawlCalls: number;
    pageSpeedLive: number;
    pageSpeedCached: number;
    pageSpeedEstimated: number;
  };
  creditUsage: {
    groq: {
      usedToday: number;
      dailyLimit: number;
      remaining: number;
      usagePercent: number;
      totalUsed: number;
    };
    firecrawl: {
      usedToday: number;
      dailyLimit: number;
      remaining: number;
      usagePercent: number;
      totalUsed: number;
    };
  };
  keyHealth: {
    groqKeyConfigured: boolean;
    firecrawlKeyConfigured: boolean;
    pageSpeedKeyConfigured: boolean;
    supabaseConfigured: boolean;
    redisConfigured: boolean;
    clerkSecretConfigured: boolean;
  };
  topUsers: Array<{
    userId: string;
    email: string;
    userStatus: UserStatus;
    usedToday: number;
  }>;
  users: AdminUserRow[];
}

export interface AdminWaitlistRequestRow {
  userId: string;
  email: string;
  name: string;
  userStatus: UserStatus;
  waitlistStatus: WaitlistStatus;
  proApproved: boolean;
  requestedAt: string | null;
  reviewedAt: string | null;
  proSince: string | null;
}

export interface AdminWaitlistResponse {
  success: boolean;
  summary: {
    total: number;
    pending: number;
    approved: number;
    denied: number;
  };
  requests: AdminWaitlistRequestRow[];
}

export interface AdminWaitlistActionResponse {
  success: boolean;
  message: string;
  request: AdminWaitlistRequestRow;
}
