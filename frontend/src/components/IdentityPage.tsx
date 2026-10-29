import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getIdentity, type IdentityInfo } from "@/lib/api";

function StatusBadge({ registered }: { registered: boolean | null }) {
  if (registered === true) return <Badge tone="success">Registered</Badge>;
  if (registered === false) return <Badge tone="warning">Not registered</Badge>;
  return <Badge tone="neutral">Could not verify</Badge>;
}

function statusMessage(registered: boolean | null) {
  if (registered === true) return "This wallet holds an identity in the ERC-8004 registry on Celo Mainnet.";
  if (registered === false) return "No identity was found for this wallet in the ERC-8004 registry yet.";
  return "The registry could not be checked right now. This does not mean the wallet is unregistered.";
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-3.5">
      <div className="text-[10px] uppercase tracking-[.16em] text-slate-500">{label}</div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 break-all font-mono text-xs text-electric hover:underline">
          {value}
          <ExternalLink size={12} className="shrink-0" />
        </a>
      ) : (
        <div className="mt-1.5 break-all font-mono text-xs text-slate-200">{value}</div>
      )}
    </div>
  );
}

export function IdentityPage() {
  const [identity, setIdentity] = useState<IdentityInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getIdentity()
      .then(setIdentity)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load identity"));
  }, []);

  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-mint">Agent identity</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Identity</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
          ERC-8004 gives an agent a public on-chain identity that others can verify before they trust it.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
          {error}. Make sure the backend is running (npx tsx server.ts).
        </div>
      )}

      {identity === null && !error && <Skeleton className="h-48 w-full" />}

      {identity && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration status</CardTitle>
              <StatusBadge registered={identity.registered} />
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-slate-400">{statusMessage(identity.registered)}</p>
              <Row
                label="Agent wallet"
                value={identity.address || "Not configured"}
                href={identity.address ? `https://celoscan.io/address/${identity.address}` : undefined}
              />
              <Row label="ERC-8004 registry" value={identity.registry} href={`https://celoscan.io/address/${identity.registry}`} />
              <Row label="Attribution tag" value={identity.attributionTag} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Declared capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {identity.capabilities.map((capability) => (
                  <Badge key={capability} tone="info">{capability}</Badge>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-600">
                These are the capabilities listed in the identity metadata the agent registers with.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}