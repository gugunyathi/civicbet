import React from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { 
  Droplet, 
  Zap, 
  MapPin, 
  Activity, 
  TrendingUp, 
  Compass, 
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowUpRight
} from "lucide-react";
import { useStore } from "@/lib/store";
import { type Market, SERVICES } from "@/lib/data";

interface CategoryMeta {
  id: string;
  serviceKey: "water" | "electricity" | "roads";
  label: string;
  emoji: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  glowColor: string;
  defaultPlaceholders: {
    title: string;
    suburb: string;
    hoursAgo: number;
    volume: number;
    probability: number;
  }[];
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "water",
    serviceKey: "water",
    label: "Water Supply",
    emoji: "🚰",
    icon: <Droplet className="h-5 w-5 text-sky-400" />,
    color: "#38bdf8",
    bgGradient: "radial-gradient(circle at 30% 20%, #38bdf825, #38bdf805 60%, transparent)",
    glowColor: "rgba(56, 189, 248, 0.2)",
    defaultPlaceholders: [
      {
        title: "Main pipeline pressure drops",
        suburb: "Bryanston",
        hoursAgo: 2,
        volume: 4200,
        probability: 78,
      },
      {
        title: "Reservoir capacity critical level",
        suburb: "Soweto",
        hoursAgo: 4,
        volume: 1800,
        probability: 62,
      }
    ]
  },
  {
    id: "power",
    serviceKey: "electricity",
    label: "Power Grid",
    emoji: "⚡",
    icon: <Zap className="h-5 w-5 text-amber-400" />,
    color: "#facc15",
    bgGradient: "radial-gradient(circle at 30% 20%, #facc1525, #facc1505 60%, transparent)",
    glowColor: "rgba(250, 204, 21, 0.2)",
    defaultPlaceholders: [
      {
        title: "Substation overload risk detection",
        suburb: "Randburg",
        hoursAgo: 1,
        volume: 8900,
        probability: 91,
      },
      {
        title: "Feeder cable theft warning",
        suburb: "Sandton",
        hoursAgo: 3,
        volume: 3100,
        probability: 45,
      }
    ]
  },
  {
    id: "roads",
    serviceKey: "roads",
    label: "Roads & Traffic",
    emoji: "🛣️",
    icon: <Compass className="h-5 w-5 text-orange-400" />,
    color: "#f59e0b",
    bgGradient: "radial-gradient(circle at 30% 20%, #f59e0b25, #f59e0b05 60%, transparent)",
    glowColor: "rgba(245, 158, 11, 0.2)",
    defaultPlaceholders: [
      {
        title: "Pothole expansion on arterial route",
        suburb: "Midrand",
        hoursAgo: 5,
        volume: 1200,
        probability: 53,
      },
      {
        title: "Stormwater drain flooding alert",
        suburb: "Rosebank",
        hoursAgo: 8,
        volume: 2400,
        probability: 68,
      }
    ]
  }
];

export function MarketDashboard() {
  const { markets } = useStore();

  // Filter open and resolving markets
  const activeMarkets = React.useMemo(() => {
    return markets.filter(m => m.status === "open" || m.status === "settling");
  }, [markets]);

  return (
    <div className="space-y-6">
      {/* Dashboard Summary Header */}
      <div className="rounded-3xl border border-white/5 bg-black/40 p-5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="h-24 w-24 text-cyan-400 animate-pulse" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400">
                Nexus Sector Live Engine
              </p>
            </div>
            <h2 className="font-display mt-2 text-xl font-bold text-white sm:text-2xl">
              Civic Infrastructure Prediction Dashboard
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Staked by citizen scouts, powered by decentralized verification. 
              Monitor active water flow issues, power substation stress levels, and road outages.
            </p>
          </div>
          <div className="flex gap-4 border-t border-white/5 pt-4 md:border-none md:pt-0 shrink-0">
            <div className="px-3 py-1.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-[9px] text-muted-foreground uppercase tracking-wider">Active Outages</span>
              <span className="font-mono text-lg font-bold text-cyan-400">{activeMarkets.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-[9px] text-muted-foreground uppercase tracking-wider">Chaos Pools</span>
              <span className="font-mono text-lg font-bold text-amber-400">
                {(markets.reduce((acc, m) => acc + m.volume, 0) / 1000).toFixed(1)}k <span className="text-xs font-sans text-muted-foreground">pts</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout of Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((category, catIdx) => {
          // Find real active markets matching this category's service key
          const realMarkets = activeMarkets.filter(
            m => m.service === category.serviceKey
          );

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: catIdx * 0.1 }}
              className="glass rounded-3xl p-5 border border-white/5 relative flex flex-col min-h-[460px] overflow-hidden"
              style={{
                boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.03)`
              }}
            >
              {/* Radial gradient background to match theme */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-40 transition-all duration-500" 
                style={{ background: category.bgGradient }} 
              />

              {/* Category Header */}
              <header className="relative z-10 flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="p-2 rounded-2xl border border-white/10 flex items-center justify-center transition-all"
                    style={{
                      background: `${category.color}15`,
                      boxShadow: `0 0 15px ${category.glowColor}`
                    }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-1.5">
                      {category.label}
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {realMarkets.length} LIVE MARKETS
                    </p>
                  </div>
                </div>
                <span className="text-lg">{category.emoji}</span>
              </header>

              {/* Market Outage List */}
              <div className="relative z-10 space-y-3 flex-1 flex flex-col">
                {/* 1. Real Active Markets */}
                {realMarkets.map(market => (
                  <Link
                    key={market.id}
                    to="/markets/$id"
                    params={{ id: market.id }}
                    className="group block rounded-2xl border border-white/5 bg-black/25 p-3 hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all relative overflow-hidden"
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-[2px] transition-all" 
                      style={{ background: category.color }}
                    />
                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                          <span style={{ color: category.color }}>{market.ref.slice(0, 7)}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-2 w-2" /> {market.suburb}
                          </span>
                        </div>
                        <h4 className="mt-1 text-xs font-medium text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">
                          {market.title}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-muted-foreground font-mono">
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" /> {(market.volume / 1000).toFixed(1)}k vol
                          </span>
                          <span>·</span>
                          <span>{market.options[0]?.yesPct ?? 50}% implied fix</span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-cyan-400 transition-colors shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))}

                {/* 2. Visual List Placeholders / Skeletal Pending Items */}
                {/* We show placeholders to fill the list to at least 3 items to look like a full predictive board */}
                {Array.from({ length: Math.max(0, 3 - realMarkets.length) }).map((_, index) => {
                  const placeholder = category.defaultPlaceholders[index % category.defaultPlaceholders.length];
                  return (
                    <div
                      key={`placeholder-${index}`}
                      className="rounded-2xl border border-dashed border-white/5 bg-black/10 p-3 relative overflow-hidden select-none opacity-60 hover:opacity-85 transition-opacity"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                            <span className="flex items-center gap-0.5 text-amber-500/80">
                              <ShieldAlert className="h-2 w-2" /> PENDING LAUNCH
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-2 w-2" /> {placeholder.suburb}
                            </span>
                          </div>
                          <h4 className="mt-1 text-xs font-medium text-white/90 italic line-clamp-1">
                            {placeholder.title}...
                          </h4>
                          <div className="mt-1.5 flex items-center gap-2.5 text-[10px] text-muted-foreground font-mono">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {placeholder.hoursAgo}h ago
                            </span>
                            <span>·</span>
                            <span className="text-amber-400/80">{placeholder.probability}% threat factor</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground self-start px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 uppercase tracking-wider scale-90">
                          CF-Bond
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Category Footer Stats */}
              <div className="relative z-10 border-t border-white/5 mt-auto pt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                  Avg Fix: <strong className="text-white">{category.id === "water" ? "4.2" : category.id === "power" ? "6.8" : "12.4"}h</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5 text-[9px] tracking-widest uppercase">
                  Vol Multiplier: 1.{category.id === "water" ? "3" : category.id === "power" ? "5" : "1"}x
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
