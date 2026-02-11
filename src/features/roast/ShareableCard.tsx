import { cleanDomain, excerpt } from "../../shared/lib/utils";
import type { RoastResult, ShareCardTheme } from "../../shared/types";

interface ShareableCardProps {
  roast: RoastResult;
  id?: string;
  preview?: boolean;
  theme?: ShareCardTheme;
}

type ThemeTokens = {
  label: string;
  isLight: boolean;
  shellBg: string;
  shellBorder: string;
  wash: string;
  frameBg: string;
  frameBorder: string;
  panelBg: string;
  panelBorder: string;
  panelSoftBg: string;
  panelSoftBorder: string;
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
  subtle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  footerBg: string;
  footerBorder: string;
  shadow: string;
};

const themes: Record<ShareCardTheme, ThemeTokens> = {
  websiteDark: {
    label: "Website Theme",
    isLight: false,
    shellBg: "#0b0f17",
    shellBorder: "rgba(255,93,58,0.42)",
    wash:
      "radial-gradient(760px circle at 12% 4%, rgba(255,93,58,0.22), transparent 57%), radial-gradient(780px circle at 96% 0%, rgba(255,255,255,0.08), transparent 62%)",
    frameBg: "rgba(16,23,37,0.84)",
    frameBorder: "rgba(255,93,58,0.3)",
    panelBg: "rgba(15,22,35,0.84)",
    panelBorder: "rgba(255,255,255,0.14)",
    panelSoftBg: "rgba(12,18,29,0.88)",
    panelSoftBorder: "rgba(255,255,255,0.1)",
    accent: "#ff6a4a",
    accentSoft: "rgba(255,106,74,0.24)",
    text: "#f8fafc",
    muted: "#d1d5db",
    subtle: "#9ca3af",
    badgeBg: "rgba(255,93,58,0.22)",
    badgeBorder: "rgba(255,93,58,0.58)",
    badgeText: "#ffd3c8",
    footerBg: "rgba(0,0,0,0.22)",
    footerBorder: "rgba(255,255,255,0.14)",
    shadow: "0 28px 90px rgba(0,0,0,0.45)"
  },
  noirDark: {
    label: "Noir Dark",
    isLight: false,
    shellBg: "#0a0d12",
    shellBorder: "rgba(201,210,224,0.28)",
    wash:
      "radial-gradient(760px circle at 12% 4%, rgba(201,210,224,0.2), transparent 57%), radial-gradient(780px circle at 96% 0%, rgba(255,255,255,0.06), transparent 62%)",
    frameBg: "rgba(20,24,32,0.86)",
    frameBorder: "rgba(201,210,224,0.22)",
    panelBg: "rgba(17,21,29,0.86)",
    panelBorder: "rgba(201,210,224,0.12)",
    panelSoftBg: "rgba(13,17,24,0.9)",
    panelSoftBorder: "rgba(201,210,224,0.1)",
    accent: "#e5e7eb",
    accentSoft: "rgba(229,231,235,0.24)",
    text: "#f9fafb",
    muted: "#d1d5db",
    subtle: "#9ca3af",
    badgeBg: "rgba(201,210,224,0.22)",
    badgeBorder: "rgba(201,210,224,0.5)",
    badgeText: "#f8fafc",
    footerBg: "rgba(0,0,0,0.24)",
    footerBorder: "rgba(201,210,224,0.14)",
    shadow: "0 28px 90px rgba(0,0,0,0.5)"
  },
  midnightDark: {
    label: "Midnight Dark",
    isLight: false,
    shellBg: "#0a1124",
    shellBorder: "rgba(129,140,248,0.4)",
    wash:
      "radial-gradient(760px circle at 12% 4%, rgba(129,140,248,0.28), transparent 57%), radial-gradient(780px circle at 96% 0%, rgba(255,255,255,0.06), transparent 62%)",
    frameBg: "rgba(18,28,54,0.86)",
    frameBorder: "rgba(129,140,248,0.26)",
    panelBg: "rgba(15,24,46,0.86)",
    panelBorder: "rgba(191,219,254,0.14)",
    panelSoftBg: "rgba(11,19,37,0.9)",
    panelSoftBorder: "rgba(191,219,254,0.1)",
    accent: "#bfdbfe",
    accentSoft: "rgba(191,219,254,0.26)",
    text: "#f8fafc",
    muted: "#dbeafe",
    subtle: "#93c5fd",
    badgeBg: "rgba(129,140,248,0.24)",
    badgeBorder: "rgba(129,140,248,0.52)",
    badgeText: "#dbeafe",
    footerBg: "rgba(0,0,0,0.24)",
    footerBorder: "rgba(191,219,254,0.16)",
    shadow: "0 28px 90px rgba(6,8,30,0.55)"
  },
  ivoryLight: {
    label: "Ivory Light",
    isLight: true,
    shellBg: "#f9f4f2",
    shellBorder: "rgba(229,61,24,0.28)",
    wash:
      "radial-gradient(760px circle at 12% 4%, rgba(255,98,66,0.28), transparent 57%), radial-gradient(780px circle at 96% 0%, rgba(255,255,255,0.7), transparent 62%)",
    frameBg: "rgba(255,249,248,0.92)",
    frameBorder: "rgba(229,61,24,0.22)",
    panelBg: "rgba(255,252,251,0.94)",
    panelBorder: "rgba(183,47,19,0.18)",
    panelSoftBg: "rgba(255,248,246,0.95)",
    panelSoftBorder: "rgba(183,47,19,0.14)",
    accent: "#e53d18",
    accentSoft: "rgba(229,61,24,0.18)",
    text: "#1f2937",
    muted: "#374151",
    subtle: "#6b7280",
    badgeBg: "rgba(229,61,24,0.14)",
    badgeBorder: "rgba(229,61,24,0.34)",
    badgeText: "#b72f13",
    footerBg: "rgba(255,250,249,0.9)",
    footerBorder: "rgba(183,47,19,0.16)",
    shadow: "0 22px 70px rgba(183,47,19,0.16)"
  },
  frostLight: {
    label: "Frost Light",
    isLight: true,
    shellBg: "#eef4ff",
    shellBorder: "rgba(59,130,246,0.3)",
    wash:
      "radial-gradient(760px circle at 12% 4%, rgba(59,130,246,0.25), transparent 57%), radial-gradient(780px circle at 96% 0%, rgba(255,255,255,0.75), transparent 62%)",
    frameBg: "rgba(255,255,255,0.92)",
    frameBorder: "rgba(59,130,246,0.24)",
    panelBg: "rgba(252,254,255,0.94)",
    panelBorder: "rgba(30,64,175,0.18)",
    panelSoftBg: "rgba(247,251,255,0.95)",
    panelSoftBorder: "rgba(30,64,175,0.14)",
    accent: "#1d4ed8",
    accentSoft: "rgba(29,78,216,0.2)",
    text: "#0f172a",
    muted: "#334155",
    subtle: "#64748b",
    badgeBg: "rgba(59,130,246,0.16)",
    badgeBorder: "rgba(59,130,246,0.34)",
    badgeText: "#1d4ed8",
    footerBg: "rgba(255,255,255,0.9)",
    footerBorder: "rgba(30,64,175,0.18)",
    shadow: "0 22px 70px rgba(30,64,175,0.2)"
  }
};

function qualityScore(roast: RoastResult) {
  if (typeof roast.qualityScore === "number") {
    return Math.round(roast.qualityScore);
  }
  return Math.max(0, 100 - Math.round(roast.roastScore));
}

function severityScore(roast: RoastResult) {
  if (typeof roast.severityScore === "number") {
    return Math.round(roast.severityScore);
  }
  return Math.round(roast.roastScore);
}

function qualityTone(score: number, isLight: boolean) {
  if (score >= 85) {
    return isLight ? "#047857" : "#34d399";
  }
  if (score >= 65) {
    return isLight ? "#d92626" : "#ff5c5c";
  }
  return isLight ? "#b91c1c" : "#f87171";
}

function sourceLabel(source?: RoastResult["metricsSource"]) {
  if (source === "firecrawl") {
    return "Content Data";
  }
  if (source === "pagespeed") {
    return "Live Data";
  }
  if (source === "cached") {
    return "Cached Data";
  }
  return "Estimated Data";
}

function summaryText(roast: RoastResult, preview: boolean) {
  const sentences = roast.roast
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const first =
    sentences[0] ||
    "This website has strong potential, but first-screen clarity and structure need refinement.";
  const second =
    sentences[1] ||
    "A cleaner hierarchy and tighter interaction flow will reduce visitor drop-off.";

  return {
    lineA: excerpt(first, preview ? 96 : 175),
    lineB: excerpt(second, preview ? 96 : 175),
    metrics: `Performance ${roast.metrics.performance}/100 • Accessibility ${roast.metrics.accessibility}/100 • SEO ${roast.metrics.seo}/100 • Load ${roast.metrics.loadTime}`
  };
}

function priorityAction(roast: RoastResult, preview: boolean) {
  if (!roast.fixes?.length) {
    return {
      title: "Clarify hierarchy and CTA",
      why: "Reduce visual competition and strengthen the primary action above the fold.",
      next: "Re-run roast after your first layout cleanup."
    };
  }

  return {
    title: roast.fixes[0].title,
    why: excerpt(roast.fixes[0].why, preview ? 96 : 145),
    next: roast.fixes[1]?.title || "Re-run roast after shipping this fix."
  };
}

export function ShareableCard({
  roast,
  id = "shareable-card",
  preview = false,
  theme = "websiteDark"
}: ShareableCardProps) {
  const quality = qualityScore(roast);
  const severity = severityScore(roast);
  const isPro = roast.userStatus === "pro";
  const tokens = themes[theme];
  const summary = summaryText(roast, preview);
  const action = priorityAction(roast, preview);
  const topFixes = roast.fixes?.slice(0, 2) || [];
  const evidence = roast.evidence?.slice(0, 2) || [];
  const qualityColor = qualityTone(quality, tokens.isLight);

  return (
    <div
      id={id}
      className={
        preview
          ? "relative aspect-[16/10] w-full overflow-hidden rounded-[24px] border p-3 md:p-4"
          : "relative h-[600px] w-[800px] overflow-hidden rounded-[30px] border p-6"
      }
      style={{
        backgroundColor: tokens.shellBg,
        borderColor: tokens.shellBorder,
        color: tokens.text,
        boxShadow: tokens.shadow
      }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: tokens.wash }} />

      <div className={`relative z-10 flex h-full flex-col ${preview ? "gap-2" : "gap-3"}`}>
        <header
          className={`grid grid-cols-[1fr_auto] items-start rounded-2xl border ${preview ? "gap-2 px-3 py-2" : "gap-3 px-4 py-3"}`}
          style={{ backgroundColor: tokens.frameBg, borderColor: tokens.frameBorder }}
        >
          <div>
            <p className={preview ? "font-display text-lg font-bold" : "font-display text-2xl font-bold"}>
              RoastMySite
            </p>
            <p
              className={preview ? "text-xs" : "mt-1 text-base"}
              style={{ color: tokens.muted }}
            >
              {cleanDomain(roast.url)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${preview ? "" : "px-3 py-1 text-[10px]"}`}
              style={{
                backgroundColor: tokens.badgeBg,
                borderColor: tokens.badgeBorder,
                color: tokens.badgeText
              }}
            >
              AI Roast Report
            </span>
            <span
              className="rounded-full border px-2.5 py-0.5 text-[9px] uppercase tracking-[0.14em]"
              style={{
                borderColor: tokens.panelBorder,
                backgroundColor: tokens.panelSoftBg,
                color: tokens.subtle
              }}
            >
              {tokens.label}
            </span>
          </div>
        </header>

        <main
          className="grid min-h-0 flex-1 gap-2.5"
          style={{
            gridTemplateColumns: preview ? "1.78fr 0.72fr" : "1.72fr 0.78fr"
          }}
        >
          <section
            className="min-h-0 rounded-2xl border flex flex-col overflow-hidden"
            style={{ backgroundColor: tokens.panelBg, borderColor: tokens.panelBorder }}
          >
            <div
              className={`flex items-center justify-between border-b ${preview ? "px-2.5 py-1.5" : "px-3 py-2"}`}
              style={{ borderColor: tokens.panelBorder }}
            >
              <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: tokens.subtle }}>
                Website Preview
              </p>
              <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: tokens.subtle }}>
                {sourceLabel(roast.metricsSource)}
              </span>
            </div>

            <div className={`min-h-0 flex-1 ${preview ? "p-1.5" : "p-2"}`}>
              {roast.screenshot ? (
                <img
                  src={`data:image/jpeg;base64,${roast.screenshot}`}
                  alt="Website screenshot"
                  className="h-full w-full rounded-xl object-contain object-top"
                  style={{ backgroundColor: tokens.panelSoftBg }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-xl border text-xs"
                  style={{
                    borderColor: tokens.panelSoftBorder,
                    backgroundColor: tokens.panelSoftBg,
                    color: tokens.subtle
                  }}
                >
                  Screenshot unavailable
                </div>
              )}
            </div>

            <div
              className={`border-t ${preview ? "px-2.5 py-2" : "px-3 py-2.5"}`}
              style={{ borderColor: tokens.panelBorder }}
            >
              <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: tokens.subtle }}>
                Roast Summary
              </p>
              <div className={preview ? "mt-1.5 space-y-1.5 text-[11px] leading-[1.14rem]" : "mt-2 space-y-2 text-sm leading-6"}>
                <p>{summary.lineA}</p>
                <p>{summary.lineB}</p>
                <p style={{ color: tokens.accent }}>{excerpt(summary.metrics, preview ? 104 : 205)}</p>
              </div>
            </div>
          </section>

          <aside
            className={`min-h-0 rounded-2xl border ${preview ? "p-2" : "p-3"} flex flex-col gap-2`}
            style={{ backgroundColor: tokens.panelSoftBg, borderColor: tokens.panelSoftBorder }}
          >
            <article
              className={`rounded-xl border ${preview ? "px-2.5 py-2" : "px-3 py-2.5"}`}
              style={{ backgroundColor: tokens.panelBg, borderColor: tokens.panelBorder }}
            >
              <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: tokens.subtle }}>
                Quality Score
              </p>
              <p className={preview ? "mt-1 text-3xl font-extrabold" : "mt-1.5 text-5xl font-extrabold"} style={{ color: qualityColor }}>
                {quality}
              </p>
              <div className="mt-2 h-px w-full" style={{ backgroundImage: `linear-gradient(90deg, ${tokens.accentSoft} 0%, transparent 100%)` }} />
              <p className={preview ? "mt-1.5 text-[10px] uppercase tracking-[0.14em]" : "mt-2 text-xs uppercase tracking-[0.14em]"} style={{ color: tokens.muted }}>
                Severity {severity}/100
              </p>
            </article>

            <article
              className={`rounded-xl border ${preview ? "px-2.5 py-2" : "px-3 py-2.5"}`}
              style={{ backgroundColor: tokens.panelBg, borderColor: tokens.panelBorder }}
            >
              <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: tokens.subtle }}>
                Priority Action
              </p>
              <p className="mt-1.5 text-xs font-semibold" style={{ color: tokens.accent }}>
                {excerpt(action.title, preview ? 45 : 72)}
              </p>
              <p className={preview ? "mt-1 text-[10px] leading-4" : "mt-1.5 text-xs leading-5"} style={{ color: tokens.muted }}>
                {action.why}
              </p>
              <p className={preview ? "mt-1 text-[10px]" : "mt-1.5 text-xs"} style={{ color: tokens.subtle }}>
                Next: {excerpt(action.next, preview ? 48 : 74)}
              </p>
            </article>

            <article
              className={`min-h-0 flex-1 rounded-xl border ${preview ? "px-2.5 py-2" : "px-3 py-2.5"}`}
              style={{ backgroundColor: tokens.panelBg, borderColor: tokens.panelBorder }}
            >
              <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: tokens.subtle }}>
                Proof & Fixes
              </p>

              <div className={preview ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2"}>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: tokens.subtle }}>
                    Top Fixes
                  </p>
                  <div className={preview ? "mt-1 space-y-1" : "mt-1.5 space-y-1.5"}>
                    {topFixes.length ? (
                      topFixes.map((fix, idx) => (
                        <p key={`fix-${idx}`} className={preview ? "text-[10px]" : "text-xs"} style={{ color: tokens.text }}>
                          {idx + 1}. {excerpt(fix.title, preview ? 34 : 58)}
                        </p>
                      ))
                    ) : (
                      <p className={preview ? "text-[10px]" : "text-xs"} style={{ color: tokens.subtle }}>
                        Fix list unavailable.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: tokens.subtle }}>
                    Evidence
                  </p>
                  <div className={preview ? "mt-1 space-y-1" : "mt-1.5 space-y-1.5"}>
                    {evidence.length ? (
                      evidence.map((item, idx) => (
                        <p key={`evidence-${idx}`} className={preview ? "text-[10px]" : "text-xs"} style={{ color: tokens.muted }}>
                          {item.label}: {excerpt(item.value, preview ? 30 : 58)}
                        </p>
                      ))
                    ) : (
                      <p className={preview ? "text-[10px]" : "text-xs"} style={{ color: tokens.subtle }}>
                        Evidence unavailable.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </aside>
        </main>

        <footer
          className={`flex items-center justify-between rounded-xl border ${preview ? "px-2.5 py-1.5 text-[10px]" : "px-4 py-2.5 text-xs"}`}
          style={{
            backgroundColor: tokens.footerBg,
            borderColor: tokens.footerBorder,
            color: tokens.muted
          }}
        >
          <span>{isPro ? "Private Pro Report" : "Roasted by roastmy.site"}</span>
          <span>{new Date(roast.timestamp).toLocaleDateString()}</span>
        </footer>
      </div>
    </div>
  );
}
