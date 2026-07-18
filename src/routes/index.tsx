import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { CITIES, SERVICES, type ServiceKind } from "@/lib/data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({ meta: [{ title: "Civic.Bet — Predict & fix your city" }] }),
});

const FILTERS: (ServiceKind | "all")[] = ["all", "water", "electricity", "roads", "refuse", "safety", "billing", "parks", "other"];

function Home() {
  const { markets } = useStore();
  const [city, setCity] = useState<string>("all");
  const [filter, setFilter] = useState<ServiceKind | "all">("all");

  const filtered = useMemo(
    () => markets.filter(m =>
      (city === "all" || m.city === city) &&
      (filter === "all" || m.service === filter)
    ),
    [markets, city, filter]
  );

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

      {/* Markets — main content of home */}
      <section className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">
            No live markets match your filters.
          </div>
        )}
        {filtered.map(m => <MarketCard key={m.id} market={m} />)}
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
