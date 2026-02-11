import { Link2, Loader2, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { normalizeUrl, validateUrl } from "../../shared/lib/utils";
import type { PersonaOption, RoastMode, UserStatus } from "../../shared/types";
import { Button } from "../../shared/ui/Button";

interface PremiumRoastFormProps {
  loading: boolean;
  onSubmit: (
    url: string,
    persona: PersonaOption,
    roastMode?: RoastMode | "auto"
  ) => Promise<void> | void;
  remaining?: number | null;
  userStatus?: UserStatus;
  compact?: boolean;
}

const PERSONA_STORAGE_KEY = "roastmysite:persona";

const personaOptions: Array<{ value: PersonaOption; label: string }> = [
  { value: "auto", label: "Auto Persona" },
  { value: "assassin", label: "Stand-up Assassin" },
  { value: "kitchen", label: "Kitchen Nightmare" },
  { value: "courtroom", label: "Courtroom Roast" },
  { value: "sports", label: "Sports Commentary" }
];

const personaDescriptions: Record<PersonaOption, string> = {
  auto: "Auto Persona: rotates style automatically for more varied roast tone.",
  assassin: "Stand-up Assassin: fast punchlines with sharp direct callouts.",
  kitchen: "Kitchen Nightmare: chef-style intensity and brutal urgency.",
  courtroom: "Courtroom Roast: prosecutor tone with evidence-first criticism.",
  sports: "Sports Commentary: play-by-play style with momentum language."
};

const roastModeDescriptions: Record<RoastMode | "auto", string> = {
  auto: "Auto mode: free users get Content roast first, then Design roast. Pro defaults to Design unless changed.",
  content:
    "Content Roast: Firecrawl analyzes text, headings, SEO metadata, and broken links.",
  design:
    "Design Roast: screenshot + Lighthouse analyze visual UX, performance, and accessibility."
};

export function PremiumRoastForm({
  loading,
  onSubmit,
  remaining,
  userStatus = "free",
  compact = false
}: PremiumRoastFormProps) {
  const [url, setUrl] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [persona, setPersona] = useState<PersonaOption>("auto");
  const [roastMode, setRoastMode] = useState<RoastMode | "auto">("auto");
  const isPro = userStatus === "pro";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERSONA_STORAGE_KEY) as PersonaOption | null;
      if (
        saved === "auto" ||
        saved === "assassin" ||
        saved === "kitchen" ||
        saved === "courtroom" ||
        saved === "sports"
      ) {
        setPersona(saved);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  const validationError = useMemo(() => validateUrl(url), [url]);
  const error =
    manualError ||
    (url.trim().length > 0
      ? validationError
      : null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualError(null);
    if (validationError) {
      return;
    }

    try {
      await onSubmit(normalizeUrl(url), persona, roastMode);
    } catch (caught) {
      const message =
        typeof caught === "string"
          ? caught
          : caught instanceof Error
            ? caught.message
            : "Failed to roast this URL.";
      setManualError(message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`group relative ${compact ? "max-w-none" : "mx-auto max-w-2xl"}`}
    >
      <div className="relative rounded-2xl border border-white/10 bg-zinc-950/88 p-2">
        <div className="mb-2 rounded-xl border border-ember-300/20 bg-ember-300/10 px-3 py-2 text-xs font-semibold text-ember-100">
          {isPro
            ? "Unlimited mode: choose persona and roast type."
            : userStatus === "waitlist"
              ? "Waitlist pending: free usage is locked until approval."
              : "2 free roasts/day."}
        </div>

        <div className={`mb-2 grid gap-2 ${isPro ? "md:grid-cols-[1fr_auto_auto]" : "md:grid-cols-[1fr_auto]"}`}>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setManualError(null);
              }}
              disabled={loading}
              placeholder="https://your-startup.com"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 py-3 pl-9 pr-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-ember-400 focus:ring-2 focus:ring-ember-500/30"
            />
          </div>

          <select
            value={persona}
            onChange={(event) => {
              const value = event.target.value as PersonaOption;
              setPersona(value);
              try {
                localStorage.setItem(PERSONA_STORAGE_KEY, value);
              } catch {
                // ignore storage issues
              }
            }}
            disabled={loading}
            className="rounded-xl border border-zinc-800 bg-zinc-900/75 px-3 py-3 text-sm font-medium text-zinc-200 outline-none transition focus:border-ember-400 focus:ring-2 focus:ring-ember-500/30"
          >
            {personaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isPro ? (
            <select
              value={roastMode}
              onChange={(event) => {
                setRoastMode(event.target.value as RoastMode | "auto");
                setManualError(null);
              }}
              disabled={loading}
              className="rounded-xl border border-zinc-800 bg-zinc-900/75 px-3 py-3 text-sm font-medium text-zinc-200 outline-none transition focus:border-ember-400 focus:ring-2 focus:ring-ember-500/30"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="content">Content Roast</option>
              <option value="design">Design Roast</option>
            </select>
          ) : null}
        </div>

        <div className={`mb-2 grid gap-2 ${isPro ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/55 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Persona</p>
            <p className="mt-1 text-xs leading-5 text-zinc-300">
              {personaDescriptions[persona]}
            </p>
          </div>
          {isPro ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Roast Type</p>
              <p className="mt-1 text-xs leading-5 text-zinc-300">
                {roastModeDescriptions[roastMode]}
              </p>
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          className={`w-full rounded-xl px-5 py-3 text-sm ${compact ? "md:min-w-[150px]" : ""}`}
          disabled={loading || Boolean(validationError) || userStatus === "waitlist"}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Roasting...
            </>
          ) : userStatus === "waitlist" ? (
            <>Waitlist Pending</>
          ) : (
            <>
              Get Roasted
              <Sparkles className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-ember-200">{error}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
          <span>Public URLs only</span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span>No localhost/private links</span>
          {typeof remaining === "number" ? (
            <>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>
                {remaining} roast{remaining === 1 ? "" : "s"} left today
              </span>
            </>
          ) : null}
        </div>
      )}
    </form>
  );
}
