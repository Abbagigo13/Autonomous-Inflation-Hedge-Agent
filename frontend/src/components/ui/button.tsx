import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  return <button className={cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-mint text-[#0b0e0d] shadow-[0_0_22px_rgba(184,255,106,.12)] hover:-translate-y-0.5 hover:bg-[#ccff92]",
    variant === "ghost" && "text-slate-400 hover:bg-white/[.04] hover:text-white",
    variant === "outline" && "border border-white/10 bg-white/[.02] text-slate-200 hover:border-mint/40 hover:text-mint",
    className
  )} {...props} />;
}
