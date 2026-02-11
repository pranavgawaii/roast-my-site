import { motion } from "framer-motion";
import { CheckCircle2, Crown, Flame, Sparkles } from "lucide-react";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { cleanDomain, scoreColor } from "../../shared/lib/utils";
import type { RoastResult, ShareCardTheme } from "../../shared/types";
import { MetricsDisplay } from "./MetricsDisplay";
import { ShareButtons } from "./ShareButtons";
import { ShareableCard } from "./ShareableCard";

interface RoastResultsProps {
  roast: RoastResult;
  onRoastAnother: () => void;
  onJoinWaitlist?: () => void;
  shareTheme: ShareCardTheme;
  onShareThemeChange: (theme: ShareCardTheme) => void;
}

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

function metricsSourceLabel(source?: RoastResult["metricsSource"]) {
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

const shareThemeOptions: Array<{
  value: ShareCardTheme;
  label: string;
  swatch: string;
}> = [
  {
    value: "websiteDark",
    label: "Website Theme",
    swatch: "linear-gradient(135deg, #ff3b3b 0%, #0b0f17 62%)"
  },
  {
    value: "noirDark",
    label: "Noir Dark",
    swatch: "linear-gradient(135deg, #e5e7eb 0%, #0d1015 62%)"
  },
  {
    value: "midnightDark",
    label: "Midnight Dark",
    swatch: "linear-gradient(135deg, #8293ff 0%, #0a1020 62%)"
  },
  {
    value: "ivoryLight",
    label: "Rose Light",
    swatch: "linear-gradient(135deg, #fff1f1 0%, #ffd6d6 62%)"
  },
  {
    value: "frostLight",
    label: "Frost Light",
    swatch: "linear-gradient(135deg, #f4f8ff 0%, #dbeafe 62%)"
  }
];

export function RoastResults({
  roast,
  onRoastAnother,
  onJoinWaitlist,
  shareTheme,
  onShareThemeChange
}: RoastResultsProps) {
  const quality = qualityScore(roast);
  const severity = severityScore(roast);
  const evidence = roast.evidence || [];
  const fixes = roast.fixes || [];
  const freeLimitReached =
    roast.userStatus === "free" &&
    (((typeof roast.remaining === "number" && roast.remaining <= 0) ||
      (typeof roast.dailyLimit === "number" &&
        typeof roast.usedToday === "number" &&
        roast.usedToday >= roast.dailyLimit)));
  const waitlistPending = roast.userStatus === "waitlist";

  return (
    <div className="space-y-6">
      <Card className="relative space-y-4" glow>
        {quality > 90 ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {Array.from({ length: 14 }).map((_, idx) => (
              <motion.span
                key={idx}
                className="absolute block h-2 w-2 rounded-full bg-ember-300/75"
                style={{ left: `${(idx * 7) % 95}%`, top: "-8px" }}
                animate={{
                  y: [0, 180],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.3,
                  delay: idx * 0.05,
                  repeat: Infinity,
                  repeatDelay: 1.4
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-400">Roast Results</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-white">
              {cleanDomain(roast.url)}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {roast.userStatus === "pro" ? (
              <Badge tone="success">
                <Crown className="mr-1 h-3.5 w-3.5" />
                PRO
              </Badge>
            ) : null}
            <Badge tone={quality > 85 ? "success" : quality > 60 ? "warning" : "danger"}>
              Quality {quality}/100
            </Badge>
            <Badge tone={severity > 70 ? "danger" : severity > 40 ? "warning" : "success"}>
              Severity {severity}/100
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Quality Score</p>
            <p className={`mt-2 text-4xl font-extrabold ${scoreColor(quality)}`}>{quality}/100</p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Persona</p>
            <p className="mt-2 text-base font-semibold text-zinc-100">
              {roast.personaUsed ? roast.personaUsed : "auto"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Metrics Source</p>
            <p className="mt-2 text-base font-semibold text-zinc-100">
              {metricsSourceLabel(roast.metricsSource)}
            </p>
          </div>
        </div>

        {severity > 75 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-ember-500/35 bg-ember-500/10 p-3 text-sm text-ember-200"
          >
            <Flame className="h-4 w-4" />
            Brutality is high. Fix the top items first before shipping the next release.
          </motion.div>
        ) : null}

        {quality >= 90 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-ember-400/35 bg-ember-300/12 p-3 text-sm text-ember-100"
          >
            <Sparkles className="h-4 w-4" />
            This one passed with strong quality and minimal damage.
          </motion.div>
        ) : null}
      </Card>

      {freeLimitReached ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-ember-300/35 bg-ember-300/10">
          <p className="text-sm text-ember-100">
            2/2 used for today. Join Pro waitlist for unlimited roasts.
          </p>
          <Button onClick={onJoinWaitlist}>Join Pro Waitlist</Button>
        </Card>
      ) : null}

      {waitlistPending ? (
        <Card className="border-ember-300/35 bg-ember-300/10">
          <p className="text-sm text-ember-100">
            Your Pro request is pending review. You will unlock unlimited roasts after approval.
          </p>
        </Card>
      ) : null}

      <Card>
        {roast.screenshot ? (
          <div className="mb-5 overflow-hidden rounded-xl border border-zinc-800">
            <img
              src={`data:image/jpeg;base64,${roast.screenshot}`}
              alt="Website screenshot"
              className="max-h-[460px] w-full object-cover object-top"
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
            Screenshot unavailable for this roast.
            {roast.screenshotCaptureError ? ` ${roast.screenshotCaptureError}` : ""}
          </div>
        )}
        <h3 className="font-display text-xl font-bold text-white">The Roast</h3>
        <p className="mt-4 whitespace-pre-wrap leading-8 text-zinc-100">{roast.roast}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Proof</h3>
          {evidence.length ? (
            <div className="space-y-2">
              {evidence.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-950/55 p-3"
                >
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    {item.label} · {item.impact}
                  </p>
                  <p className="mt-1 text-sm text-zinc-200">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Proof chips unavailable for this report.</p>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="font-display text-lg font-bold text-white">Top 5 fixes</h3>
          {fixes.length ? (
            <div className="space-y-2">
              {fixes.map((fix, index) => (
                <div
                  key={`${fix.title}-${index}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-950/55 p-3"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <CheckCircle2 className="h-4 w-4 text-ember-300" />
                    {fix.title}
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                      Effort {fix.effort}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">{fix.why}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Fix checklist unavailable for this report.</p>
          )}
        </Card>
      </div>

      <MetricsDisplay metrics={roast.metrics} />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold text-white">Preview Card</h3>
          <p className="text-xs text-zinc-400">
            This is the exact short-summary card used for share/download.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shareThemeOptions.map((option) => {
            const active = shareTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onShareThemeChange(option.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-ember-300/70 bg-ember-300/16 text-ember-100"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-white/35"
                  style={{ backgroundImage: option.swatch }}
                />
                {option.label}
              </button>
            );
          })}
        </div>
        <ShareableCard roast={roast} id="shareable-card-preview" preview theme={shareTheme} />
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ShareButtons roast={roast} centered />
          <Button variant="ghost" onClick={onRoastAnother}>
            Roast Another Site
          </Button>
        </div>
      </Card>
    </div>
  );
}
