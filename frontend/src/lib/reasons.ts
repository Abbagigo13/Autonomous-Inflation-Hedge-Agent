export type ReasonInfo = {
  label: string;
  tone: "neutral" | "success" | "warning" | "info";
  detail: string;
};

const REASONS: Record<string, ReasonInfo> = {
  executed: { label: "Executed", tone: "success", detail: "The hedge transaction was sent and confirmed." },
  "dry-run-prepared": { label: "Dry run complete", tone: "info", detail: "A tagged swap was prepared but not sent, because dry-run mode is on." },
  "below-threshold": { label: "No hedge needed", tone: "neutral", detail: "Inflation was below the trigger, so the agent did nothing." },
  "quote-rejected": { label: "Quote rejected", tone: "warning", detail: "Textile FX rejected the quote request. The terminal shows the exact reason." },
  "no-transaction": { label: "Quote not usable", tone: "warning", detail: "Textile FX answered, but the quote was missing something needed to build the transaction." },
  "quote-unsafe": { label: "Quote not safe", tone: "warning", detail: "A safety check on Textile's quote failed, so nothing was sent. The terminal shows which check." },
  "quote-expired": { label: "Quote expired", tone: "warning", detail: "The quote expired before it could be used. Run again; any approval is already in place." },
  "insufficient-wars": { label: "Not enough wARS", tone: "warning", detail: "The wallet holds less wARS than the quote requires." },
  "insufficient-gas": { label: "Not enough CELO", tone: "warning", detail: "The wallet does not hold enough CELO to pay for gas." },
  "approval-target-unknown": { label: "Approval target unknown", tone: "warning", detail: "The quote did not name who may spend the wARS, so nothing was sent." },
  "swap-failed": { label: "Swap failed", tone: "warning", detail: "The swap could not be completed. The terminal shows why." },
  "wallet-missing": { label: "Wallet missing", tone: "warning", detail: "No agent wallet key is configured." },
  "api-key-missing": { label: "API key missing", tone: "warning", detail: "No Textile FX API key is configured." },
  "execution-blocked": { label: "Not executed", tone: "warning", detail: "The hedge did not go through. This run was saved before detailed reasons were recorded." }
};

export function describeReason(reason?: string): ReasonInfo {
  return (reason && REASONS[reason]) || { label: "Unknown", tone: "neutral", detail: "No reason was recorded for this run." };
}