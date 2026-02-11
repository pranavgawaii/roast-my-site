import { BrandLogo } from "../../shared/ui/BrandLogo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.7fr_1fr_1fr]">
          <div>
            <BrandLogo size="sm" className="font-medium" />
            <p className="mt-4 max-w-md leading-7 text-zinc-400">
              Brutally honest website feedback for teams that care about
              conversion, clarity, and speed.
            </p>
            <p className="mt-4 inline-flex rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
              roastmy.site
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Explore</p>
            <ul className="mt-4 space-y-2 text-zinc-300">
              <li>
                <a href="#features" className="transition hover:text-zinc-100">
                  Features
                </a>
              </li>
              <li>
                <a href="#workflow" className="transition hover:text-zinc-100">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition hover:text-zinc-100">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Platform</p>
            <ul className="mt-4 space-y-2 text-zinc-300">
              <li>AI Roast Reports</li>
              <li>Dashboard History</li>
              <li>Shareable Results</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-zinc-500 md:flex-row md:items-center">
          <p>© 2026 RoastMySite. All rights reserved.</p>
          <p>
            Design & Developed by{" "}
            <a
              href="https://pranavx.in"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ember-300 hover:text-ember-200"
            >
              pranavgawai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
