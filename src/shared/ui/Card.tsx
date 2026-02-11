import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({
  children,
  className,
  glow = false,
  ...props
}: PropsWithChildren<CardProps>) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6",
        glow && "ring-1 ring-ember-400/25",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
