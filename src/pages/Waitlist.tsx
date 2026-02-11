import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, Waitlist, useAuth, useUser } from "@clerk/clerk-react";
import { ArrowLeft, CheckCircle2, Crown, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "../shared/ui/Badge";
import { BrandLogo } from "../shared/ui/BrandLogo";
import { Card } from "../shared/ui/Card";
import { getAccountStatus, joinProWaitlist } from "../shared/lib/groq";
import type { AccountStatusResponse } from "../shared/types";

function statusTone(status?: AccountStatusResponse["waitlistStatus"]) {
  if (status === "approved") {
    return "success";
  }
  if (status === "pending") {
    return "warning";
  }
  if (status === "denied") {
    return "danger";
  }
  return "neutral";
}

export default function WaitlistPage() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [account, setAccount] = useState<AccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const response = await getAccountStatus(token);
        if (active) {
          setAccount(response);
        }
      } catch (err) {
        console.warn("Failed to fetch account status:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [getToken, isSignedIn]);

  const requestWaitlist = async () => {
    try {
      setSubmitting(true);
      const token = await getToken();
      if (!token) {
        toast.error("Please sign in first.");
        return;
      }

      const response = await joinProWaitlist(token);
      toast.success(response.message);

      setAccount((current) => ({
        success: true,
        userStatus: response.userStatus,
        waitlistStatus: response.waitlistStatus,
        proApproved: response.userStatus === "pro",
        dailyLimit: current?.dailyLimit ?? 2,
        usedToday: current?.usedToday ?? 0,
        remaining: current?.remaining ?? 0,
        userId: current?.userId
      }));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Failed to submit waitlist request.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-10 pt-4 md:px-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/95 px-4 py-3 md:px-5">
        <BrandLogo />
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/85 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </header>

      <main className="mx-auto mt-6 w-full max-w-4xl space-y-4">
        <Card className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="warning">Premium Access</Badge>
            <Badge tone="neutral">Unlimited Roasts</Badge>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">
            Pro Waitlist
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
            Join the approval queue to unlock unlimited roasting, cleaner share cards, and
            priority usage access.
          </p>
        </Card>

        <SignedIn>
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Account</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <Badge tone={statusTone(account?.waitlistStatus)}>
                {account?.waitlistStatus === "approved"
                  ? "Approved"
                  : account?.waitlistStatus === "pending"
                    ? "Pending Review"
                    : account?.waitlistStatus === "denied"
                      ? "Not Approved"
                      : "Not Requested"}
              </Badge>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-zinc-400">Loading your plan status...</p>
            ) : null}

            {!loading && account?.userStatus === "pro" ? (
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-100">
                <p className="inline-flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  You already have Pro access.
                </p>
                <p className="mt-2 text-sm text-emerald-100/90">
                  Unlimited roasts are active in your dashboard.
                </p>
              </div>
            ) : null}

            {!loading && account?.waitlistStatus === "pending" ? (
              <div className="mt-4 rounded-xl border border-ember-400/30 bg-ember-400/10 p-4 text-ember-100">
                Request submitted. We will review and approve manually.
              </div>
            ) : null}

            {!loading &&
              account?.userStatus !== "pro" &&
              account?.waitlistStatus !== "pending" ? (
              <div className="mt-5">
                <button
                  onClick={requestWaitlist}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4" />
                      Request Pro Access
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </Card>
        </SignedIn>

        <SignedOut>
          <Card className="space-y-5 p-6">
            <p className="text-sm leading-7 text-zinc-300">
              Sign in first to request Pro approval on your account.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/sign-in"
                className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/sign-up"
                className="inline-flex rounded-lg bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 transition hover:bg-white"
              >
                Create account
              </Link>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                Optional Clerk Waitlist
              </p>
              <Waitlist
                afterJoinWaitlistUrl="/sign-up"
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    card: "!bg-transparent !border-0 !shadow-none !p-0",
                    rootBox: "!w-full",
                    footer: "!hidden",
                    formButtonPrimary:
                      "!rounded-xl !bg-zinc-100 !text-zinc-900 hover:!bg-white !font-bold"
                  }
                }}
              />
            </div>
          </Card>
        </SignedOut>
      </main>
    </div>
  );
}
