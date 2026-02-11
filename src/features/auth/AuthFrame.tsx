import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "../../shared/ui/BrandLogo";

interface AuthFrameProps {
  title: string;
  subtitle: string;
}

export function AuthFrame({
  title,
  subtitle,
  children
}: PropsWithChildren<AuthFrameProps>) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 pb-7 pt-3 md:px-8 md:pt-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_18%_8%,rgba(255,92,58,0.16),transparent_45%),radial-gradient(700px_circle_at_82%_0%,rgba(255,255,255,0.07),transparent_50%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/90 px-4 py-3 md:px-5">
        <BrandLogo />
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/85 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Home
        </Link>
      </header>

      <main className="relative z-10 mx-auto mt-4 flex w-full max-w-6xl justify-center md:mt-7">
        <section className="relative w-full max-w-[560px] overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/92 p-4 shadow-[0_22px_60px_rgba(0,0,0,0.42)] md:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember-300/65 to-transparent" />

          <p className="inline-flex items-center rounded-full border border-ember-300/25 bg-ember-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ember-200">
            Secure Access
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-300 md:text-[15px]">{subtitle}</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-900/55">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
