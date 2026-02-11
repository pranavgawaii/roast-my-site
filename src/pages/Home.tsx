import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Clock3,
  Flame,
  LayoutDashboard,
  LineChart,
  Shield,
  Sparkles,
  Target,
  X,
  Zap
} from "lucide-react";
import { Footer } from "../features/landing/Footer";
import { BrandLogo } from "../shared/ui/BrandLogo";
import { Card } from "../shared/ui/Card";
import { launchMessaging } from "../config/launchMessaging";

const heroStats = [
  { icon: Clock3, label: "Median Analysis", value: "14.2s" },
  { icon: LineChart, label: "Average Severity", value: "71/100" },
  { icon: Flame, label: "Reports Generated", value: "12.8k+" }
];

const windowSignals = [
  { label: "Performance", value: "64/100" },
  { label: "Accessibility", value: "78/100" },
  { label: "SEO", value: "89/100" }
];

const windowFixes = [
  "Strengthen primary CTA contrast and size.",
  "Reduce first-fold copy to one clear value line.",
  "Defer non-critical scripts for faster first paint."
];

const windowProof = [
  "CTA visibility score: low",
  "FCP above target on mobile",
  "First viewport has competing actions"
];

const features = [
  {
    icon: Bot,
    title: "Vision + Metrics Engine",
    text: "Screenshot analysis, UX heuristics, and performance scoring merged into one report."
  },
  {
    icon: Target,
    title: "Actionable Fixes",
    text: "Each roast ends with practical changes so you can improve outcomes fast."
  },
  {
    icon: Shield,
    title: "Secure By Design",
    text: "Only public URLs are analyzed. No admin credentials or private source access."
  }
];

const steps = [
  {
    icon: BadgeCheck,
    title: "1. Sign In",
    text: "Enter your private RoastMySite workspace."
  },
  {
    icon: Zap,
    title: "2. Submit URL",
    text: "Paste any public website link inside the dashboard."
  },
  {
    icon: Flame,
    title: "3. Get Roasted",
    text: "Review a detailed roast report with metrics and fix guidance."
  }
];

const plans = [
  {
    name: "Free",
    price: "₹0",
    detail: "For indie builders and quick quality checks.",
    points: [
      "Login required, 2 roasts/day",
      "AI roast report with actionable fixes",
      "Shareable results"
    ]
  },
  {
    name: "Premium",
    price: "Coming Soon",
    detail: "For teams running frequent iteration cycles.",
    points: [
      "Unlimited roasts",
      "Deeper multi-angle analysis",
      "History + team insights"
    ]
  }
];

const testimonials = [
  {
    initials: "AG",
    name: "Aarav G.",
    quote:
      "It pointed out why visitors were dropping before CTA. Brutal but exactly right."
  },
  {
    initials: "PM",
    name: "Priya M.",
    quote:
      "One roast and I fixed hierarchy + copy. My landing page feels 10x clearer."
  },
  {
    initials: "RV",
    name: "Rohan V.",
    quote:
      "The performance + UX mix is solid. It catches what normal audits miss."
  },
  {
    initials: "NK",
    name: "Neha K.",
    quote: "The roast was funny, but the fixes were practical enough to ship the same day."
  },
  {
    initials: "JS",
    name: "Jason S.",
    quote: "Best pre-launch quality check I have used. Fast, direct, and useful."
  },
  {
    initials: "ML",
    name: "Marcus L.",
    quote: "Great tool for catching conversion friction before publishing updates."
  }
];

export default function Home() {
  const [showLaunchBanner, setShowLaunchBanner] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("roastmysite:launch-banner-dismissed");
      setShowLaunchBanner(dismissed !== "1");
    } catch {
      setShowLaunchBanner(true);
    }
  }, []);

  const dismissLaunchBanner = () => {
    setShowLaunchBanner(false);
    try {
      localStorage.setItem("roastmysite:launch-banner-dismissed", "1");
    } catch {
      // ignore storage issues
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden pb-8">
      <header className="sticky top-0 z-50 px-4 pt-4 md:px-8">
        <div className="mx-auto max-w-7xl overflow-visible rounded-2xl border border-zinc-800 bg-zinc-950/95 px-4 py-3.5 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo className="overflow-visible leading-none" />

            <nav className="hidden items-center gap-1 md:flex">
              <a
                href="#features"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                Features
              </a>
              <a
                href="#workflow"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
              >
                Pricing
              </a>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <SignedOut>
                <Link
                  to="/sign-in"
                  className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200 transition hover:border-zinc-600 hover:text-white sm:px-3 sm:py-2 sm:text-xs"
                >
                  Log In
                </Link>
                <Link
                  to="/sign-up"
                  className="inline-flex rounded-lg bg-[#ff4d22] px-2.5 py-1.5 text-[11px] font-bold text-black transition hover:bg-[#ff5a2f] sm:px-4 sm:py-2 sm:text-xs"
                >
                  Get Started
                </Link>
              </SignedOut>

              <SignedIn>
                <Link
                  to="/dashboard"
                  className="hidden items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:text-white sm:inline-flex"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "ring-2 ring-zinc-600"
                    }
                  }}
                />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {showLaunchBanner ? (
          <section className="mx-auto mt-4 max-w-7xl px-4 md:px-8">
            <div className="rounded-2xl border border-ember-300/25 bg-zinc-950/90 p-3 md:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-200">
                  {launchMessaging.inAppBanner}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    to={launchMessaging.waitlistCta.url}
                    className="inline-flex rounded-lg bg-[#ff4d22] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#ff5a2f]"
                  >
                    {launchMessaging.waitlistCta.label}
                  </Link>
                  <button
                    onClick={dismissLaunchBanner}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:text-white"
                    aria-label="Dismiss launch banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-[96rem] px-2 pb-24 pt-6 md:px-5 md:pb-28 md:pt-14 lg:px-7 lg:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[34px] border border-white/10 bg-zinc-950/82 px-6 pt-12 pb-20 md:px-10 md:pt-16 md:pb-28 lg:px-14 lg:pt-20 lg:pb-36"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_circle_at_0%_0%,rgba(255,111,52,0.14),transparent_58%),radial-gradient(760px_circle_at_100%_0%,rgba(255,255,255,0.07),transparent_62%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-ember-300/10 blur-3xl"
              animate={{ scale: [1, 1.06, 1], opacity: [0.28, 0.45, 0.28] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 mx-auto max-w-5xl text-center">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full border border-ember-400/35 bg-ember-400/12 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ember-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Premium Roast Reports
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.45 }}
                className="mt-5 font-display text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl"
              >
                Brutal Website Feedback
                <span className="block text-ember-200">Built For Better Conversions</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.45 }}
                className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-zinc-300 md:text-lg"
              >
                Get a clear, high-signal report on UX, visual hierarchy, and performance,
                then ship fixes that move real product metrics.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mt-6 flex flex-wrap items-center justify-center gap-3"
              >
                <SignedOut>
                  <p className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300">
                    Login from navbar to start your first roast.
                  </p>
                </SignedOut>
                <SignedIn>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
                  >
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </SignedIn>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              className="relative z-10 mx-auto mt-8 max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55"
            >
              <div className="grid sm:grid-cols-3">
                {heroStats.map((item, idx) => (
                  <motion.div
                    key={item.label}
                    className={`px-4 py-4 text-left ${idx > 0 ? "border-t border-zinc-800 sm:border-l sm:border-t-0" : ""}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08, duration: 0.35 }}
                  >
                    <item.icon className="h-4 w-4 text-ember-300" />
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-zinc-100">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="features" className="mx-auto mt-10 max-w-6xl px-4 pb-16 md:mt-14 md:px-8 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/82 p-3 md:p-4"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(620px_circle_at_0%_0%,rgba(255,111,52,0.12),transparent_60%),radial-gradient(760px_circle_at_100%_0%,rgba(255,255,255,0.05),transparent_64%)]" />
            <div className="pointer-events-none absolute right-12 top-10 h-28 w-28 rounded-full bg-ember-300/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/88">
              <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-zinc-900/78 px-4">
                <span className="h-3 w-3 rounded-full bg-ember-500/75" />
                <span className="h-3 w-3 rounded-full bg-amber-300/70" />
                <span className="h-3 w-3 rounded-full bg-zinc-500/65" />
                <div className="ml-3 w-full rounded-md border border-zinc-700/70 bg-zinc-950/85 px-2 py-1 text-[11px] text-zinc-500">
                  https://roastmy.site/dashboard
                </div>
              </div>

              <div className="grid h-[460px] gap-4 p-4 md:h-[500px] lg:grid-cols-[1.42fr_0.88fr] lg:p-5">
                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05, duration: 0.45 }}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/58"
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Live Roast Report</p>
                    <span className="rounded-full border border-ember-300/35 bg-ember-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ember-100">
                      high signal
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 p-4">
                    <div className="rounded-lg border border-white/10 bg-zinc-950/85 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Executive Summary</p>
                      <h3 className="mt-2 text-lg font-semibold text-zinc-100 md:text-xl">
                        Conversion friction detected on first fold.
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        Clear visuals, but too many competing priorities above the fold. The report focuses
                        fixes on CTA prominence, concise messaging, and faster interaction readiness.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {windowSignals.map((item) => (
                        <div key={item.label} className="rounded-lg border border-zinc-800 bg-zinc-950/88 px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{item.label}</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-100">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Top Fixes</p>
                        <div className="mt-2 space-y-1.5">
                          {windowFixes.slice(0, 2).map((item) => (
                            <p key={item} className="text-xs text-zinc-300">
                              • {item}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Proof Signals</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {windowProof.slice(0, 2).map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-[10px] text-zinc-300"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>

                <motion.aside
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.45 }}
                  className="flex h-full flex-col gap-3"
                >
                  <div className="rounded-xl border border-white/10 bg-zinc-950/82 p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Quality Score</p>
                    <p className="mt-1 text-4xl font-semibold text-zinc-100">79</p>
                    <p className="mt-1 text-xs text-zinc-400">Severity 25/100 • Production-ready with targeted fixes</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-zinc-950/82 p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Roast Mode</p>
                    <p className="mt-2 text-sm font-medium text-zinc-200">Kitchen Nightmare</p>
                    <p className="mt-1 text-xs leading-6 text-zinc-400">
                      Blunt language with actionable outputs designed for shipping teams.
                    </p>
                  </div>

                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="mt-auto rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Window Status</p>
                    <p className="mt-2 text-sm text-zinc-200">Live dashboard output mirrored for landing preview.</p>
                  </motion.div>
                </motion.aside>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 md:mt-12 md:px-8 md:pb-20">
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full border-white/10 bg-zinc-950/55 p-6">
                  <item.icon className="h-5 w-5 text-ember-300" />
                  <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">{item.text}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-12 py-6 md:mt-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                What Builders Say
              </p>
            </div>
          </div>
          <div className="mt-6 overflow-hidden py-1">
            <div className="roast-marquee px-4 md:px-8">
              {[...testimonials, ...testimonials].map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="w-80 flex-shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ember-400 text-[11px] font-bold text-zinc-900">
                      {item.initials}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">"{item.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto mt-12 max-w-7xl px-4 pb-20 pt-10 md:mt-16 md:px-8 md:pt-14">
          <div className="text-center">
            <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
              How it works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
              Authentication first, roast actions inside your private dashboard,
              and clear outputs in one polished report flow.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, idx) => (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-7"
              >
                <step.icon className="h-5 w-5 text-ember-300" />
                <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-zinc-400">{step.text}</p>
                <span className="mt-5 block h-1 w-0 rounded-full bg-ember-400 transition-all duration-500 group-hover:w-full" />
              </motion.article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto mt-10 max-w-6xl px-4 pb-20 pt-4 md:mt-14 md:px-8 md:pt-8">
          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950/78 p-6 md:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(580px_circle_at_0%_0%,rgba(255,111,52,0.12),transparent_58%),radial-gradient(760px_circle_at_100%_0%,rgba(255,255,255,0.06),transparent_62%)]" />
            <div className="text-center">
              <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
                Pricing that starts free
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-zinc-400">
                Start with the free tier now, then scale when your team needs
                deeper workflow features.
              </p>
            </div>

            <div className="relative z-10 mt-10 grid gap-4 md:grid-cols-2">
              {plans.map((plan) => {
                const isFree = plan.name === "Free";
                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: isFree ? 0.02 : 0.1, duration: 0.4 }}
                  >
                    <Card
                      className={`p-6 ${isFree ? "border-ember-400/35 bg-ember-400/10" : "border-white/10 bg-zinc-950/60"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-widest text-zinc-500">
                          {plan.name}
                        </p>
                        {isFree ? (
                          <span className="rounded-full border border-ember-300/40 bg-ember-300/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ember-100">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 font-display text-3xl font-bold text-white">{plan.price}</p>
                      <p className="mt-2 text-sm text-zinc-400">{plan.detail}</p>
                      <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                        {plan.points.map((point) => (
                          <li key={point} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-ember-300" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-6xl px-4 pb-8 md:mt-14 md:px-8">
          <Card className="overflow-hidden border-white/10 bg-zinc-950/45 p-8 text-center md:p-12">
            <h2 className="font-display text-3xl font-bold text-white md:text-5xl">
              Ready to pressure test your website?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Sign in, run your first roast from the dashboard, and turn blunt
              feedback into better conversion decisions.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <SignedOut>
                <Link
                  to="/sign-up"
                  className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-6 py-3 text-sm font-semibold text-zinc-950 ring-1 ring-ember-400/70 transition hover:bg-ember-400"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-ember-500 px-6 py-3 text-sm font-semibold text-zinc-950 ring-1 ring-ember-400/70 transition hover:bg-ember-400"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SignedIn>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
