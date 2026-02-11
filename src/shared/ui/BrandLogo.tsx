import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md";
}

const sizeMap = {
  sm: {
    shell: "h-7 w-7 rounded-lg",
    icon: "h-4 w-4",
    text: "text-base"
  },
  md: {
    shell: "h-8 w-8 rounded-xl",
    icon: "h-5 w-5",
    text: "text-lg"
  }
};

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 overflow-visible font-display font-bold tracking-tight leading-none text-white transition-colors hover:text-ember-400",
        className
      )}
      aria-label="RoastMySite home"
    >
      <span className="relative inline-flex h-6 w-6 flex-none items-center justify-center overflow-visible">
        <span className="brand-flame-glow" aria-hidden />
        <Flame className={cn("brand-flame relative z-10 overflow-visible text-ember-500", sizeMap[size].icon)} />
      </span>
      <span className={cn(sizeMap[size].text)}>RoastMySite</span>
    </Link>
  );
}
