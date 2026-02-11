import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { BrandLogo } from "../shared/ui/BrandLogo";

export default function About() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-16 pt-6 md:px-8">
      <header className="mb-8 flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-2">
          <Link to="/" className="text-sm text-zinc-300 hover:text-white">
            Home
          </Link>
          <SignedOut>
            <Link
              to="/sign-in"
              className="inline-flex rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Sign In
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="hidden rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-xs font-semibold text-ember-200 transition hover:border-ember-400 hover:text-ember-100 sm:inline-flex"
            >
              Dashboard
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "ring-2 ring-ember-400/40"
                }
              }}
            />
          </SignedIn>
        </div>
      </header>

      <div className="glass rounded-2xl p-6 md:p-8">
        <h1 className="font-display text-3xl font-bold text-white">About RoastMySite</h1>
        <p className="mt-4 leading-7 text-zinc-200">
          RoastMySite turns website screenshots and Lighthouse metrics into funny,
          brutally honest feedback. It is meant to help developers quickly spot
          design, UX, and performance issues with actionable fixes.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-white">
          Stack
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-200">
          <li>React + TypeScript + Tailwind + Framer Motion</li>
          <li>Vercel serverless API routes</li>
          <li>Puppeteer screenshot capture + PageSpeed Insights</li>
          <li>Groq vision model for roast generation</li>
          <li>Upstash Redis for simple free-tier rate limits</li>
        </ul>
      </div>
    </div>
  );
}
