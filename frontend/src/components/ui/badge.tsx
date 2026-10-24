import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "info" }) {
  return <span className={cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em]",
    tone === "neutral" && "border-white/10 bg-white/[.03] text-slate-400",
    tone === "success" && "border-mint/20 bg-mint/10 text-mint",
    tone === "warning" && "border-amber/20 bg-amber/10 text-amber",
    tone === "info" && "border-electric/20 bg-electric/10 text-electric",
    className
  )} {...props} />;
}
