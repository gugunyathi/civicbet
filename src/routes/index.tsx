import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { CITIES, SERVICES, type ServiceKind } from "@/lib/data";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Civic.Bet — Predict & fix your city" }] }),
});

const FILTERS: (ServiceKind | "all")[] = ["all", "water", "electricity", "roads", "refuse", "safety", "billing", "parks", "other"];

function Home() {
  const { markets, trendingMarkets: storeTrending, bettedMarkets: storeBetted } = useStore();
  const [city, setCity] = useState<string>("all");
  const [filter, setFilter] = useState<ServiceKind | "all">("all");
  const [activeTab, setActiveTab] = useState<"trending" | "betted">("trending");

  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_dismissed_markets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = [...prev, id];
      try {
        localStorage.setItem("nexus_dismissed_markets", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filtered = useMemo(
    () => markets.filter(m =>
      (city === "all" || m.city === city) &&
      (filter === "all" || m.service === filter)
    ),
    [markets, city, filter]
  );

  // Trending markets are those the user HAS NOT bet on, loaded from backend
  const trendingMarkets = useMemo(
    () => storeTrending.filter(m =>
      (city === "all" || m.city === city) &&
      (filter === "all" || m.service === filter)
    ),
    [storeTrending, city, filter]
  );

  // Betted markets are those the user HAS bet on, loaded from backend
  const bettedMarkets = useMemo(
    () => storeBetted.filter(m =>
      (city === "all" || m.city === city) &&
      (filter === "all" || m.service === filter)
    ),
    [storeBetted, city, filter]
  );

  const activeMarketsList = activeTab === "trending" ? trendingMarkets : bettedMarkets;

  const visibleMarkets = useMemo(() => {
    return activeMarketsList.filter(m => !dismissedIds.includes(m.id));
  }, [activeMarketsList, dismissedIds]);

  const activeCityLabel = city === "all" ? "All cities" : CITIES.find(c => c.id === city)?.name ?? "";
  const totalVolume = filtered.reduce((s, m) => s + m.volume, 0);

  return (
    <div className="space-y-5 pb-4">
      {/* Compact header */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Live prediction markets</p>
            <motion.h1
              key={activeCityLabel}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="font-display mt-1 text-2xl font-bold tracking-tight"
            >
              <span className="neon-text">{activeCityLabel}</span>
            </motion.h1>
          </div>
          <div className="text-right text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><Flame className="h-3 w-3" style={{color:"var(--neon)"}}/> {filtered.length} live</div>
            <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {(totalVolume/1000).toFixed(1)}k pts vol</div>
          </div>
        </div>

        {/* City chips */}
        <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Chip active={city === "all"} onClick={() => setCity("all")}>All ZA</Chip>
          {CITIES.map(c => (
            <Chip key={c.id} active={city === c.id} onClick={() => setCity(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>

        {/* Service filters */}
        <div className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map(f => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All services" : `${SERVICES[f as ServiceKind].emoji} ${SERVICES[f as ServiceKind].label}`}
            </Chip>
          ))}
        </div>
      </section>

      {/* Grid Categories Dashboard */}
      {/* Moved to Burger Menu */}

      {/* Bet Card Tabs */}
      <div className="flex border-b border-white/5 pb-1 gap-6 px-1">
        <button
          onClick={() => setActiveTab("trending")}
          className="relative pb-2.5 text-xs font-semibold tracking-wider transition-all uppercase flex items-center gap-2 outline-none"
          style={{
            color: activeTab === "trending" ? "var(--neon)" : "oklch(0.72 0.03 260)",
          }}
        >
          <span>🔥 Trending</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-mono text-muted-foreground">
            {trendingMarkets.length}
          </span>
          {activeTab === "trending" && (
            <motion.div
              layoutId="activeHomeTabLine"
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: "var(--neon)" }}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab("betted")}
          className="relative pb-2.5 text-xs font-semibold tracking-wider transition-all uppercase flex items-center gap-2 outline-none"
          style={{
            color: activeTab === "betted" ? "var(--neon)" : "oklch(0.72 0.03 260)",
          }}
        >
          <span>🎯 Betted ({bettedMarkets.length})</span>
          {activeTab === "betted" && (
            <motion.div
              layoutId="activeHomeTabLine"
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: "var(--neon)" }}
            />
          )}
        </button>
      </div>

      {/* Markets — main content of home */}
      <section className="space-y-3">
        {visibleMarkets.length === 0 && (
          <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
            {activeTab === "trending" ? (
              <div className="space-y-3">
                <p>No remaining trending outages match your filters.</p>
                {dismissedIds.length > 0 && (
                  <button
                    onClick={() => {
                      setDismissedIds([]);
                      localStorage.removeItem("nexus_dismissed_markets");
                      toast.success("Restored dismissed cards!");
                    }}
                    className="mx-auto block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    Restore {dismissedIds.length} dismissed cards
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-white/80">No active bets yet</p>
                <p className="text-xs">Predict on trending civic failures above to secure yield!</p>
              </div>
            )}
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {visibleMarkets.map(m => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -300, scale: 0.95, height: 0, marginBottom: 0, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 500, damping: 45 }}
            >
              <MarketCard market={m} onDismiss={() => handleDismiss(m.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </section>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap rounded-full border px-3 py-1 text-[11px] transition"
      style={{
        borderColor: active ? "var(--neon)" : "oklch(1 0 0 / 0.1)",
        background: active ? "oklch(0.90 0.24 130 / 0.12)" : "transparent",
        color: active ? "var(--neon)" : "oklch(0.72 0.03 260)",
      }}
    >
      {children}
    </button>
  );
}
