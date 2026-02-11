import type { PropsWithChildren } from "react";
import { cn } from "../lib/utils";

interface BadgeProps {
  tone?: "neutral" | "danger" | "warning" | "success";
  className?: string;
}

const toneClass = {
  neutral: "bg-zinc-800/80 text-zinc-100 ring-zinc-700",
  danger: "bg-ember-700/20 text-ember-200 ring-ember-500/40",
  warning: "bg-ember-500/18 text-ember-200 ring-ember-400/40",
  success: "bg-ember-400/20 text-ember-200 ring-ember-300/45"
};

export function Badge({
  children,
  tone = "neutral",
  className
}: PropsWithChildren<BadgeProps>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
