import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const styles: Record<ButtonVariant, string> = {
  primary:
    "theme-btn-primary bg-ember-500 text-zinc-950 ring-1 ring-ember-400/70 hover:bg-ember-400",
  secondary:
    "theme-btn-secondary bg-zinc-900/80 text-white ring-1 ring-zinc-700 hover:bg-zinc-800 dark:bg-zinc-900",
  ghost:
    "theme-btn-ghost bg-transparent text-zinc-200 ring-1 ring-zinc-700 hover:text-white hover:ring-ember-400/60"
};

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
