import { type ComponentType, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserButton, useAuth, useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  Check,
  ArrowRight,
  Ban,
  BarChart3,
  Clock3,
  History,
  Loader2,
  PlusCircle,
  Shield
} from "lucide-react";
import toast from "react-hot-toast";
import { LoadingScreen, loadingMessages } from "../features/roast/LoadingScreen";
import { PremiumRoastForm } from "../features/roast/PremiumRoastForm";
import { BrandLogo } from "../shared/ui/BrandLogo";
import { Badge } from "../shared/ui/Badge";
import { Card } from "../shared/ui/Card";
import {
  getAdminWaitlist,
  getAccountStatus,
  getAdminOverview,
  getRoastHistory,
  roastWebsite,
  updateAdminWaitlist
} from "../shared/lib/groq";
import { cleanDomain, cn } from "../shared/lib/utils";
import type {
  AdminWaitlistRequestRow,
  AdminWaitlistResponse,
  AdminOverviewResponse,
  AccountStatusResponse,
  PersonaOption,
  RoastApiError,
  RoastResult
} from "../shared/types";

const STORAGE_KEY = "roastmysite:last-result";
const HISTORY_KEY = "roastmysite:history";
const ADMIN_EMAILS = new Set(["pranvgg@gmail", "pranvgg@gmail.com"]);

type DashboardView = "new-roast" | "history" | "admin" | "insights";

const baseNavItems: Array<{
  id: DashboardView;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
    { id: "new-roast", label: "New Roast", icon: PlusCircle },
    { id: "history", label: "History", icon: History }
  ];

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null | undefined>(undefined);
  const [account, setAccount] = useState<AccountStatusResponse | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [latest, setLatest] = useState<RoastResult | null>(null);
  const [history, setHistory] = useState<RoastResult[]>([]);
  const [view, setView] = useState<DashboardView>("new-roast");
  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null);
  const [adminWaitlist, setAdminWaitlist] = useState<AdminWaitlistResponse | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActionUserId, setAdminActionUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLatest(JSON.parse(raw) as RoastResult);
      }
      const historyRaw = localStorage.getItem(HISTORY_KEY);
      if (historyRaw) {
        setHistory(JSON.parse(historyRaw) as RoastResult[]);
      }
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrateFromApi = async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }

        const [accountResult, historyResult] = await Promise.all([
          getAccountStatus(token),
          getRoastHistory(token, 20)
        ]);

        if (!active) {
          return;
        }

        setAccount(accountResult);
        setRemaining(accountResult.remaining);

        if (historyResult.history.length) {
          setHistory(historyResult.history);
          setLatest((current) => current || historyResult.history[0]);

          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(historyResult.history));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(historyResult.history[0]));
          } catch {
            // Ignore quota errors.
          }
        }
      } catch (err) {
        console.warn("Dashboard API hydration failed:", err);
      }
    };

    void hydrateFromApi();

    return () => {
      active = false;
    };
  }, [getToken]);

  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = window.setInterval(() => {
      setMessageIndex((current) => current + 1);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [loading]);

  const greetingName =
    user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || "there";
  const primaryEmail = (user?.primaryEmailAddress?.emailAddress || "").trim().toLowerCase();
  const isAdmin = ADMIN_EMAILS.has(primaryEmail);

  const navItems = useMemo(() => {
    const items: Array<{
      id: DashboardView;
      label: string;
      icon: ComponentType<{ className?: string }>;
    }> = [...baseNavItems];

    if (isAdmin) {
      items.push({ id: "admin", label: "Admin", icon: Shield });
    }

    items.push({ id: "insights", label: "Insights", icon: BarChart3 });
    return items;
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && view === "admin") {
      setView("new-roast");
    }
  }, [isAdmin, view]);

  useEffect(() => {
    if (!isAdmin || view !== "admin") {
      return;
    }

    let active = true;
    setAdminLoading(true);

    const loadAdminOverview = async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }

        const [overview, waitlist] = await Promise.all([
          getAdminOverview(token, 150),
          getAdminWaitlist(token, 400)
        ]);
        if (!active) {
          return;
        }
        setAdminOverview(overview);
        setAdminWaitlist(waitlist);
      } catch (err) {
        console.warn("Failed to load admin overview:", err);
      } finally {
        if (active) {
          setAdminLoading(false);
        }
      }
    };

    void loadAdminOverview();

    return () => {
      active = false;
    };
  }, [getToken, isAdmin, view]);

  const loadingText = useMemo(
    () => loadingMessages[messageIndex % loadingMessages.length],
    [messageIndex]
  );

  const qualityOf = (item: RoastResult) => {
    if (typeof item.qualityScore === "number") {
      return item.qualityScore;
    }
    return Math.max(0, 100 - Math.round(item.roastScore));
  };

  const avgScore = useMemo(() => {
    if (!history.length) {
      return null;
    }
    const sum = history.reduce((acc, item) => acc + qualityOf(item), 0);
    return Math.round(sum / history.length);
  }, [history]);

  const bestScore = useMemo(() => {
    if (!history.length) {
      return null;
    }
    return Math.round(Math.max(...history.map((item) => qualityOf(item))));
  }, [history]);

  const avgPerformance = useMemo(() => {
    if (!history.length) {
      return null;
    }
    const sum = history.reduce((acc, item) => acc + item.metrics.performance, 0);
    return Math.round(sum / history.length);
  }, [history]);

  const usagePercent = useMemo(() => {
    if (account?.dailyLimit === null) {
      return 100;
    }

    if (typeof account?.dailyLimit === "number") {
      if (account.dailyLimit <= 0) {
        return 100;
      }
      return Math.max(0, Math.min(100, (account.usedToday / account.dailyLimit) * 100));
    }

    if (typeof remaining === "number") {
      const inferredLimit = 2;
      return Math.max(0, Math.min(100, ((inferredLimit - remaining) / inferredLimit) * 100));
    }

    return Math.min(100, (Math.min(history.length, 2) / 2) * 100);
  }, [account, history.length, remaining]);

  const statusBadge = useMemo(() => {
    if (account?.userStatus === "pro") {
      return { label: "PRO Approved", tone: "success" as const };
    }
    if (account?.userStatus === "waitlist" || account?.waitlistStatus === "pending") {
      return { label: "Waitlist Pending", tone: "warning" as const };
    }
    return { label: "Free", tone: "neutral" as const };
  }, [account]);

  const usageText = useMemo(() => {
    if (account?.userStatus === "pro") {
      return `Pro member: ${account.usedToday} roast${account.usedToday === 1 ? "" : "s"} today (unlimited).`;
    }
    if (account?.userStatus === "waitlist") {
      return "Unlimited unlock is pending approval. Free roasts resume after approval.";
    }
    if (typeof account?.dailyLimit === "number") {
      return `${account.usedToday}/${account.dailyLimit} free roast${account.dailyLimit === 1 ? "" : "s"} used today.`;
    }
    if (typeof remaining === "number") {
      return `${remaining} free roast${remaining === 1 ? "" : "s"} remaining today.`;
    }
    return "Free tier: 2 roasts/day.";
  }, [account, remaining]);

  const roastIntroText = useMemo(() => {
    if (account?.userStatus === "pro") {
      return `Welcome back, ${greetingName}. You have unlimited roasts enabled. Choose content or design mode and run as many reports as you need.`;
    }
    if (account?.userStatus === "waitlist") {
      return `Welcome back, ${greetingName}. Your Pro request is pending review. Once approved, unlimited roasting will unlock here.`;
    }
    return `Welcome back, ${greetingName}. You have 2 free roasts available today.`;
  }, [account, greetingName]);

  const showWaitlistPrompt = useMemo(() => {
    if (account?.userStatus === "pro") {
      return false;
    }
    if (account?.userStatus === "waitlist") {
      return true;
    }
    if (typeof account?.remaining === "number" && account.remaining <= 0) {
      return true;
    }
    if (typeof remaining === "number" && remaining <= 0) {
      return true;
    }
    return false;
  }, [account, remaining]);

  const handleRoast = async (
    url: string,
    persona: PersonaOption,
    roastMode: "content" | "design" | "auto" = "auto"
  ) => {
    setLoading(true);
    const toastId = toast.loading(loadingText);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Login required to roast websites.");
      }
      const data = (await roastWebsite(url, {
        persona,
        roastMode,
        token
      })) as RoastResult;

      if (typeof data.remaining === "number" || data.remaining === null) {
        setRemaining(data.remaining);
      }

      if (typeof data.usedToday === "number" && data.userStatus) {
        const usedToday = data.usedToday;
        setAccount((current) => ({
          success: true,
          userStatus: data.userStatus || current?.userStatus || "free",
          dailyLimit:
            typeof data.dailyLimit === "number" || data.dailyLimit === null
              ? data.dailyLimit
              : current?.dailyLimit ?? null,
          usedToday,
          remaining:
            typeof data.remaining === "number" || data.remaining === null
              ? data.remaining
              : current?.remaining ?? null,
          proApproved: current?.proApproved || data.userStatus === "pro",
          waitlistStatus: current?.waitlistStatus || "none",
          userId: current?.userId
        }));
      }

      setLatest(data);
      setHistory((current) => {
        const updated = [data, ...current].slice(0, 20);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        } catch {
          // Ignore quota errors.
        }
        return updated;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Ignore quota errors.
      }
      const usedToday = typeof data.usedToday === "number" ? data.usedToday : 0;
      const milestoneMessage =
        data.userStatus === "free" && usedToday === 1
          ? "1/2 used. 1 roast left today."
          : data.userStatus === "free" && usedToday >= 2
            ? "2/2 used! Join Pro waitlist for unlimited."
            : "Roast generated!";
      toast.success(milestoneMessage, { id: toastId });
      navigate("/results", { state: data });
    } catch (caught) {
      const payload = caught as RoastApiError;
      if (typeof payload?.remaining === "number" || payload?.remaining === null) {
        setRemaining(payload.remaining);
      }
      if (
        payload?.userStatus &&
        typeof payload?.usedToday === "number" &&
        (typeof payload?.dailyLimit === "number" || payload?.dailyLimit === null)
      ) {
        const usedToday = payload.usedToday;
        setAccount((current) => ({
          success: true,
          userStatus: payload.userStatus!,
          dailyLimit: payload.dailyLimit ?? null,
          usedToday,
          remaining:
            typeof payload.remaining === "number" || payload.remaining === null
              ? payload.remaining
              : current?.remaining ?? null,
          proApproved: current?.proApproved || payload.userStatus === "pro",
          waitlistStatus:
            payload.userStatus === "waitlist" ? "pending" : current?.waitlistStatus || "none",
          userId: current?.userId
        }));
      }
      const message = payload?.message || payload?.error || "Failed to roast website.";
      toast.error(message, { id: toastId });
      throw new Error(message);
    } finally {
      setLoading(false);
      setMessageIndex(0);
    }
  };

  const handleAdminWaitlistAction = async (
    row: AdminWaitlistRequestRow,
    action: "approve" | "deny"
  ) => {
    try {
      setAdminActionUserId(row.userId);
      const token = await getToken();
      if (!token) {
        toast.error("Admin auth token missing.");
        return;
      }

      const result = await updateAdminWaitlist(token, row.userId, action);
      toast.success(result.message);

      const [overview, waitlist] = await Promise.all([
        getAdminOverview(token, 150),
        getAdminWaitlist(token, 400)
      ]);
      setAdminOverview(overview);
      setAdminWaitlist(waitlist);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Failed to update waitlist user.";
      toast.error(message);
    } finally {
      setAdminActionUserId(null);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-50 px-4 pt-4 md:px-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-zinc-800 bg-zinc-950/95 px-3 py-3 md:px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="justify-self-start">
              <BrandLogo />
            </div>
            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <button
                  key={`desktop-${item.id}`}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                    view === item.id
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center justify-self-end">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: "ring-2 ring-zinc-600"
                  }
                }}
              />
            </div>
          </div>

          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {navItems.map((item) => (
              <button
                key={`mobile-${item.id}`}
                onClick={() => setView(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  view === item.id
                    ? "bg-zinc-100 text-zinc-900"
                    : "border border-zinc-800 bg-zinc-900 text-zinc-300"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto mt-6 w-full max-w-7xl space-y-5 px-4 md:px-8">
        {view === "new-roast" ? (
          <>
            <Card className="p-5 md:p-6">
              <div className="grid gap-6">
                <section>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Start Here
                    </p>
                    <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
                  </div>
                  <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
                    Paste your website URL
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
                    {roastIntroText}
                  </p>

                  <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-950/70 p-3 md:p-4">
                    <PremiumRoastForm
                      loading={loading}
                      onSubmit={handleRoast}
                      remaining={remaining}
                      userStatus={account?.userStatus || "free"}
                      compact
                    />
                  </div>

                  {loading ? (
                    <div className="mt-4">
                      <LoadingScreen messageIndex={messageIndex} />
                    </div>
                  ) : null}

                  {showWaitlistPrompt ? (
                    <div className="mt-4 rounded-xl border border-ember-300/30 bg-ember-300/10 px-3 py-2.5 text-sm text-ember-100">
                      2/2 used. Join Premium waitlist for unlimited content + design roasts.
                      <Link to="/waitlist" className="ml-2 font-semibold underline underline-offset-4">
                        Join waitlist
                      </Link>
                    </div>
                  ) : null}
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold text-white">Daily usage</h2>
                      <Clock3 className="h-4 w-4 text-zinc-300" />
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">{usageText}</p>
                    <div className="mt-4 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-zinc-200 transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h2 className="font-display text-lg font-semibold text-white">Workspace</h2>
                    <p className="mt-2 text-sm text-zinc-300">
                      {latest
                        ? `Latest report ready for ${cleanDomain(latest.url)}.`
                        : "Run your first roast to create a report in history."}
                    </p>
                    <button
                      onClick={() => setView("history")}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white"
                    >
                      Open full history
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                </section>
              </div>
            </Card>
          </>
        ) : null}

        {view === "history" ? (
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <History className="h-4 w-4 text-zinc-300" />
              Roast history
            </h2>

            {history.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {history.map((item, idx) => (
                  <HistoryCard key={`${item.url}-${item.timestamp}-${idx}`} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-6 text-sm text-zinc-400">
                No roast history yet. Start from the
                <button
                  onClick={() => setView("new-roast")}
                  className="mx-1 font-semibold text-zinc-100 hover:text-white"
                >
                  New Roast
                </button>
                tab.
              </div>
            )}
          </Card>
        ) : null}

        {view === "insights" ? (
          <Card className="p-6">
            <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <BarChart3 className="h-4 w-4 text-zinc-300" />
              Insights
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <InsightCard
                label="Average Quality Score"
                value={avgScore !== null ? `${avgScore}/100` : "--"}
                hint="Higher means healthier site quality."
              />
              <InsightCard
                label="Best Quality Score"
                value={bestScore !== null ? `${bestScore}/100` : "--"}
                hint="Your strongest recent result."
              />
              <InsightCard
                label="Average Performance"
                value={avgPerformance !== null ? `${avgPerformance}/100` : "--"}
                hint="Computed from saved report metrics."
              />
            </div>

            <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-950/60 p-5">
              <h3 className="font-semibold text-white">Recommendation</h3>
              <p className="mt-2 text-sm leading-7 text-zinc-300">
                Re-run roasts after each design revision and compare trend changes across score,
                accessibility, and performance.
              </p>
            </div>
          </Card>
        ) : null}

        {view === "admin" && isAdmin ? (
          <Card className="p-6">
            <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-semibold text-white">
              <Shield className="h-4 w-4 text-zinc-300" />
              Admin Panel
            </h2>

            {adminLoading ? (
              <p className="text-sm text-zinc-400">Loading admin analytics...</p>
            ) : null}

            {!adminLoading && adminOverview ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <AdminStat
                    label="Total Users"
                    value={String(adminOverview.summary.totalUsers)}
                    hint="All Clerk users loaded"
                  />
                  <AdminStat
                    label="Pro Users"
                    value={String(adminOverview.summary.proUsers)}
                    hint="Approved unlimited access"
                  />
                  <AdminStat
                    label="Waitlist Pending"
                    value={String(adminOverview.summary.waitlistPending)}
                    hint="Needs manual approval"
                  />
                  <AdminStat
                    label="Waitlist Denied"
                    value={String(adminOverview.summary.waitlistDenied)}
                    hint="Rejected requests"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <AdminStat
                    label="Roasts Today"
                    value={String(adminOverview.summary.totalRoastsToday)}
                    hint={`${adminOverview.summary.authenticatedRoastsToday} signed-in roasts`}
                  />
                  <AdminStat
                    label="Groq Calls"
                    value={String(adminOverview.apiUsage.groqCalls)}
                    hint="Tracked today"
                  />
                  <AdminStat
                    label="Screenshot Calls"
                    value={String(adminOverview.apiUsage.screenshotAttempts)}
                    hint="Attempted captures"
                  />
                  <AdminStat
                    label="Firecrawl Calls"
                    value={String(adminOverview.apiUsage.firecrawlCalls)}
                    hint="Content scrape analyses"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Groq Credits</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {adminOverview.creditUsage.groq.totalUsed}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      All-time used
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Today: {adminOverview.creditUsage.groq.usedToday}/
                      {adminOverview.creditUsage.groq.dailyLimit} • Remaining{" "}
                      {adminOverview.creditUsage.groq.remaining}
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-zinc-200"
                        style={{ width: `${adminOverview.creditUsage.groq.usagePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Firecrawl Credits</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {adminOverview.creditUsage.firecrawl.totalUsed}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      All-time used
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Today: {adminOverview.creditUsage.firecrawl.usedToday}/
                      {adminOverview.creditUsage.firecrawl.dailyLimit} • Remaining{" "}
                      {adminOverview.creditUsage.firecrawl.remaining}
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-zinc-200"
                        style={{ width: `${adminOverview.creditUsage.firecrawl.usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">API Keys Health</p>
                    <div className="mt-3 space-y-2">
                      <KeyHealthRow
                        label="Groq API Key"
                        ok={adminOverview.keyHealth.groqKeyConfigured}
                      />
                      <KeyHealthRow
                        label="Firecrawl API Key"
                        ok={adminOverview.keyHealth.firecrawlKeyConfigured}
                      />
                      <KeyHealthRow
                        label="PageSpeed API Key"
                        ok={adminOverview.keyHealth.pageSpeedKeyConfigured}
                      />
                      <KeyHealthRow
                        label="Supabase"
                        ok={adminOverview.keyHealth.supabaseConfigured}
                      />
                      <KeyHealthRow
                        label="Upstash Redis"
                        ok={adminOverview.keyHealth.redisConfigured}
                      />
                      <KeyHealthRow
                        label="Clerk Secret Key"
                        ok={adminOverview.keyHealth.clerkSecretConfigured}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">PageSpeed Source Split</p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-300">
                      <p>Live: {adminOverview.apiUsage.pageSpeedLive}</p>
                      <p>Cached: {adminOverview.apiUsage.pageSpeedCached}</p>
                      <p>Estimated: {adminOverview.apiUsage.pageSpeedEstimated}</p>
                      <p className="text-xs text-zinc-500">Date key: {adminOverview.dateKey}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-700">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-3 py-2">User</th>
                          <th className="px-3 py-2">Plan</th>
                          <th className="px-3 py-2">Today</th>
                          <th className="px-3 py-2">History</th>
                          <th className="px-3 py-2">Last Sign-in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 bg-zinc-950/70 text-zinc-200">
                        {adminOverview.users.slice(0, 50).map((entry) => (
                          <tr key={entry.userId}>
                            <td className="px-3 py-2">
                              <p className="font-medium text-zinc-100">{entry.email}</p>
                              <p className="text-xs text-zinc-500">{entry.userId}</p>
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                tone={
                                  entry.userStatus === "pro"
                                    ? "success"
                                    : entry.userStatus === "waitlist"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {entry.userStatus}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">{entry.usedToday}</td>
                            <td className="px-3 py-2">{entry.historyCount}</td>
                            <td className="px-3 py-2 text-xs text-zinc-400">
                              {entry.lastSignInAt
                                ? new Date(entry.lastSignInAt).toLocaleString()
                                : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-700">
                  <div className="border-b border-zinc-800 bg-zinc-900/70 px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-100">Waitlist Requests</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Total {adminWaitlist?.summary.total || 0} • Pending{" "}
                      {adminWaitlist?.summary.pending || 0} • Approved{" "}
                      {adminWaitlist?.summary.approved || 0} • Denied{" "}
                      {adminWaitlist?.summary.denied || 0}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
                        <tr>
                          <th className="px-3 py-2">User</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Requested</th>
                          <th className="px-3 py-2">Reviewed</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 bg-zinc-950/70 text-zinc-200">
                        {(adminWaitlist?.requests || []).map((entry) => {
                          const loadingAction = adminActionUserId === entry.userId;
                          return (
                            <tr key={`waitlist-${entry.userId}`}>
                              <td className="px-3 py-2">
                                <p className="font-medium text-zinc-100">{entry.email}</p>
                                <p className="text-xs text-zinc-500">{entry.userId}</p>
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  tone={
                                    entry.waitlistStatus === "approved"
                                      ? "success"
                                      : entry.waitlistStatus === "pending"
                                        ? "warning"
                                        : "danger"
                                  }
                                >
                                  {entry.waitlistStatus}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-zinc-400">
                                {entry.requestedAt
                                  ? new Date(entry.requestedAt).toLocaleString()
                                  : "--"}
                              </td>
                              <td className="px-3 py-2 text-xs text-zinc-400">
                                {entry.reviewedAt
                                  ? new Date(entry.reviewedAt).toLocaleString()
                                  : "--"}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleAdminWaitlistAction(entry, "approve")}
                                    disabled={loadingAction}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {loadingAction ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleAdminWaitlistAction(entry, "deny")}
                                    disabled={loadingAction}
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {loadingAction ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Ban className="h-3.5 w-3.5" />
                                    )}
                                    Deny
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {!adminLoading && !adminOverview ? (
              <p className="text-sm text-zinc-400">
                Could not load admin data. Check Clerk secret, Redis, and auth token.
              </p>
            ) : null}
          </Card>
        ) : null}
      </main>
    </div>
  );
}

interface HistoryCardProps {
  item: RoastResult;
}

function HistoryCard({ item }: HistoryCardProps) {
  const qualityScore =
    typeof item.qualityScore === "number"
      ? Math.round(item.qualityScore)
      : Math.max(0, 100 - Math.round(item.roastScore));
  const severityScore =
    typeof item.severityScore === "number"
      ? Math.round(item.severityScore)
      : Math.round(item.roastScore);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4"
    >
      <p className="text-xs uppercase tracking-widest text-zinc-500">{cleanDomain(item.url)}</p>
      <p className="mt-1 text-lg font-bold text-white">Quality {qualityScore}/100</p>
      <p className="text-xs text-zinc-400">Severity {severityScore}/100</p>
      <p className="mt-1 text-xs text-zinc-500">{new Date(item.timestamp).toLocaleString()}</p>
      <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{item.roast}</p>
      <Link
        to="/results"
        state={item}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white"
      >
        View report
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.article>
  );
}

interface InsightCardProps {
  label: string;
  value: string;
  hint: string;
}

function InsightCard({ label, value, hint }: InsightCardProps) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-zinc-400">{hint}</p>
    </div>
  );
}

interface AdminStatProps {
  label: string;
  value: string;
  hint: string;
}

function AdminStat({ label, value, hint }: AdminStatProps) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-zinc-400">{hint}</p>
    </div>
  );
}

interface KeyHealthRowProps {
  label: string;
  ok: boolean;
}

function KeyHealthRow({ label, ok }: KeyHealthRowProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <Badge tone={ok ? "success" : "danger"}>{ok ? "Configured" : "Missing"}</Badge>
    </div>
  );
}
