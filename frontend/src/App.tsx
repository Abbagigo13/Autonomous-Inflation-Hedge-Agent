import { useEffect, useState } from "react";
import { Sidebar, PAGES, type PageId } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Dashboard } from "@/components/Dashboard";
import { HistoryPage } from "@/components/HistoryPage";
import { RoutesPage } from "@/components/RoutesPage";
import { TreasuryPage } from "@/components/TreasuryPage";
import { IdentityPage } from "@/components/IdentityPage";
import { cn } from "@/lib/utils";

function pageFromHash(): PageId {
  const id = window.location.hash.replace("#", "");
  return PAGES.some((p) => p.id === id) ? (id as PageId) : "overview";
}

export function App() {
  const [page, setPage] = useState<PageId>(pageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = (id: PageId) => {
    window.location.hash = id;
  };
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-graphite text-slate-100">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-70" />
      <div className="relative flex min-h-screen">
        <Sidebar page={page} onNavigate={navigate} />
        <main className="min-w-0 flex-1">
          <Topbar title={current.label} />
          <nav className="flex gap-2 overflow-x-auto border-b border-white/[.07] px-5 py-3 lg:hidden">
            {PAGES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  id === page ? "bg-white/[.08] text-white" : "text-slate-500"
                )}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="mx-auto max-w-[1500px] px-5 pb-10 pt-7 sm:px-8 lg:px-10">
            {page === "overview" && <Dashboard />}
            {page === "history" && <HistoryPage />}
            {page === "routes" && <RoutesPage />}
            {page === "treasury" && <TreasuryPage />}
            {page === "identity" && <IdentityPage />}
          </div>
        </main>
      </div>
    </div>
  );
}