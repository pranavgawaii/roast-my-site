import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { RoastResults } from "../features/roast/RoastResults";
import { ShareableCard } from "../features/roast/ShareableCard";
import { BrandLogo } from "../shared/ui/BrandLogo";
import type { RoastResult, ShareCardTheme } from "../shared/types";

const STORAGE_KEY = "roastmysite:last-result";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [shareTheme, setShareTheme] = useState<ShareCardTheme>("websiteDark");

  const roast = useMemo(() => {
    const fromState = location.state as RoastResult | undefined;
    if (fromState?.success) {
      return fromState;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as RoastResult;
    } catch {
      return null;
    }
  }, [location.state]);

  if (!roast) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-3xl font-bold text-white">No roast found</h1>
        <p className="mt-3 text-zinc-300">Generate one first to view results.</p>
        <Link
          to="/dashboard"
          className="mt-6 rounded-xl bg-ember-500 px-5 py-2.5 font-semibold text-zinc-950 ring-1 ring-ember-400/70 transition hover:bg-ember-400"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-6 md:px-8">
      <header className="mb-6 flex items-center justify-between">
        <BrandLogo />
        <div className="flex items-center gap-2">
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

      <RoastResults
        roast={roast}
        onRoastAnother={() => navigate("/dashboard")}
        onJoinWaitlist={() => navigate("/waitlist")}
        shareTheme={shareTheme}
        onShareThemeChange={setShareTheme}
      />

      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px]">
        <ShareableCard roast={roast} theme={shareTheme} />
      </div>
    </div>
  );
}
