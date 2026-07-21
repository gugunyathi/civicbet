import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Activity, MapPin, ShieldCheck, TrendingUp, Users, ChevronDown, ChevronUp, Info, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { ServiceIcon } from "@/components/ServiceIcon";
import { MiniMap } from "@/components/MiniMap";
import { BetSheet } from "@/components/BetSheet";
import { cityById, HISTORICAL_FIX_HOURS, SERVICES, type Market } from "@/lib/data";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTooltip, ReferenceLine } from "recharts";
import { toast } from "sonner";

const SERVICE_CALCULATION_INFO: Record<string, { formula: string; text: string }> = {
  water: {
    formula: "Odds = (Volume × Reservoir Latency) / Confirmations",
    text: "Water odds are calculated using municipal reservoir pressure telemetry, localized area volume, and scout verification speed. Base multiplier is 1.5×, scaling with scarcity density."
  },
  power: {
    formula: "Odds = (Grid Load × Peak Hours) / Active Scouts",
    text: "Power odds fluctuate with current load-shedding stages and peak hour grid demand. The pool multiplier increases with reporting frequency and drops as soon as a scout arrives on site."
  },
  sewage: {
    formula: "Odds = (Hazard Index × Volume) / Verified Restoration",
    text: "Sewage has an extra +20% hazard point bonus. Odds are calculated using spill severity, proximity to water systems, and verified restoration of flow."
  },
  refuse: {
    formula: "Odds = (Schedule Delay × Mass Index) / Collection Route",
    text: "Refuse follows a scheduled weekly cycle. Multipliers and odds are calculated from route delay reports, transit time, and municipal depot alerts."
  }
};

const getTrendData = (marketId: string, service: string, avgFixHours: number) => {
  let hash = 0;
  for (let i = 0; i < marketId.length; i++) {
    hash = marketId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seedValue = Math.abs(hash) % 100;
  
  let baseProb = 65;
  if (service.toLowerCase() === "power") baseProb = 78;
  if (service.toLowerCase() === "water") baseProb = 68;
  if (service.toLowerCase() === "sewage") baseProb = 52;
  if (service.toLowerCase() === "refuse") baseProb = 85;

  const fixFactor = Math.max(-15, Math.min(15, (24 - avgFixHours) * 0.5));
  const noise = (seedValue % 21) - 10;
  
  const probability = Math.min(98, Math.max(25, Math.round(baseProb + fixFactor + noise)));
  const simulatedRuns = 120 + (seedValue * 7);

  return { probability, simulatedRuns };
};

export function MarketCard({ market, onDismiss }: { market: Market; onDismiss?: () => void }) {
  const city = cityById(market.city);
  const { getMarketState, balances, placeBet } = useStore();
  const state = getMarketState(market.id);
  const [sheet, setSheet] = useState<{ optionIndex: number; side: "yes" | "no" } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const { probability: trendProb, simulatedRuns } = getTrendData(market.id, market.service, market.historicalAvgFixHours);
  const history = HISTORICAL_FIX_HOURS[market.service].map((h: number, i: number) => ({ i: `#${i+1}`, hours: h }));
  const avg = history.reduce((a, x) => a + x.hours, 0) / history.length;

  const handleToggle = (e: any) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest(".no-toggle")) {
      return;
    }
    setExpanded(!expanded);
  };

  const info = SERVICE_CALCULATION_INFO[market.service.toLowerCase()] || {
    formula: "Odds = Volume / Confirmations",
    text: "Odds are dynamically scaled based on the ratio of active predictions to verified on-site scout confirmations."
  };

  // Drag and swipe motion values
  const x = useMotionValue(0);

  // Drag visual feedback transforms
  const rightBgOpacity = useTransform(x, [0, 100], [0, 1]);
  const rightIconScale = useTransform(x, [0, 70, 100], [0.5, 1.1, 1]);

  const leftBgOpacity = useTransform(x, [-100, 0], [1, 0]);
  const leftIconScale = useTransform(x, [-100, -70, 0], [1, 1.1, 0.5]);

  // Color gradient shading outer container as card is dragged
  const bgGradient = useTransform(
    x,
    [-150, 0, 150],
    [
      "linear-gradient(to left, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0))",
      "linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0))",
      "linear-gradient(to right, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0))"
    ]
  );

  const triggerQuickBet = () => {
    try {
      if (state.status === "resolved") {
        toast.error("Market is already resolved!");
        return;
      }
      if (balances.points < 50) {
        toast.error("Insufficient points for Quick Bet!", {
          description: "Claim free points from the faucet in your profile page."
        });
        return;
      }
      
      placeBet({
        market,
        optionIndex: 0,
        side: "yes",
        currency: "points",
        stake: 50
      });
      
      toast.success("⚡ Quick Bet Placed!", {
        description: `Placed 50 pts on YES for "${market.options[0].label}"`
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to place quick bet");
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 120;
    if (info.offset.x < -threshold) {
      if (onDismiss) {
        onDismiss();
      }
    } else if (info.offset.x > threshold) {
      triggerQuickBet();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest(".no-toggle") || target.closest("input")) {
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      // Animate left swipe
      animate(x, -250, { duration: 0.25 }).then(() => {
        if (onDismiss) onDismiss();
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      // Animate right swipe, trigger bet, then return
      animate(x, 250, { duration: 0.25 }).then(() => {
        triggerQuickBet();
        animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setExpanded(prev => !prev);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl touch-pan-y" style={{ boxShadow: "var(--shadow-elev)" }}>
      {/* Quick Bet Green Swipe Background */}
      <motion.div 
        style={{ opacity: rightBgOpacity }}
        className="absolute inset-y-0 left-0 right-0 z-0 flex items-center justify-start pl-6 bg-emerald-500/10 pointer-events-none rounded-3xl"
      >
        <motion.div style={{ scale: rightIconScale }} className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider">Quick Bet YES (50 pts)</span>
        </motion.div>
      </motion.div>

      {/* Dismiss Red Swipe Background */}
      <motion.div 
        style={{ opacity: leftBgOpacity }}
        className="absolute inset-y-0 left-0 right-0 z-0 flex items-center justify-end pr-6 bg-red-500/10 pointer-events-none rounded-3xl"
      >
        <motion.div style={{ scale: leftIconScale }} className="flex items-center gap-2 text-red-400">
          <span className="text-xs font-mono font-bold uppercase tracking-wider">Dismiss Card</span>
          <XCircle className="h-5 w-5 text-red-400" />
        </motion.div>
      </motion.div>

      <motion.article
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, background: bgGradient, touchAction: "pan-y" }}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35 }}
        onTap={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="glass relative overflow-hidden rounded-3xl p-4 sm:p-5 transition-all hover:bg-white/[0.02] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neon focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
          style={{
            background: state.status === "resolved" ? "oklch(0.75 0.03 260)" : "var(--gradient-neon)",
            boxShadow: state.status === "resolved" ? "none" : "0 0 12px var(--neon)",
          }} />

      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ServiceIcon kind={market.service} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="font-mono text-neon">{market.ref}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(market.loggedAt), { addSuffix: true })}</span>
              <span>·</span>
              <div 
                className="relative inline-block no-toggle"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(!showTooltip);
                }}
              >
                <button 
                  className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 px-1.5 py-0.5 rounded-md border border-cyan-500/20"
                  aria-label="Odds calculation info"
                >
                  <Info className="h-3 w-3" />
                  <span>Calc</span>
                </button>
                
                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 sm:left-auto sm:right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-[#090e1a]/95 p-3.5 shadow-2xl backdrop-blur-xl text-left normal-case tracking-normal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {market.service.toUpperCase()} CALCULATION
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-cyan-400 block uppercase tracking-wider">DYNAMIC FORMULA</span>
                          <code className="block bg-black/40 border border-white/5 rounded-lg p-1.5 font-mono text-[10px] text-emerald-400 break-words leading-tight">
                            {info.formula}
                          </code>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-muted-foreground block uppercase tracking-wider">HOW IT WORKS</span>
                          <p className="text-[11px] text-white/80 leading-relaxed font-sans">
                            {info.text}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-white/5 text-[9px] text-muted-foreground flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          AMM curves update dynamically.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <h3 className="mt-0.5 line-clamp-1 text-[15px] font-semibold leading-tight sm:text-base">
              {market.title}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {market.suburb}, {city.name}
              {state.status !== "open" && (
                <span className="ml-1 rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                  style={{ color: state.status === "resolved" ? "var(--yes)" : "var(--cyan)" }}>
                  {state.status === "resolved" ? "Settled" : "Awaiting scouts"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="p-2 rounded-xl border border-white/5 bg-black/40 text-muted-foreground self-start">
            {expanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
          </div>
        </div>
      </header>

      {/* Conditionally showing extra content */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="expanded-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Expanded full-width MiniMap */}
            <MiniMap 
              lat={market.coords.lat} 
              lng={market.coords.lng} 
              label={`${market.suburb}, ${city.name}`} 
              className="mt-3 h-32 w-full shrink-0 no-toggle border border-white/10 shadow-lg" 
            />

            {/* Stats block underneath the map */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] no-toggle">
              <Stat icon={<Users className="h-3.5 w-3.5" />} label="Scouts" value={String(market.scoutsOnSite + state.confirmations.length)} />
              <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Avg fix" value={`${market.historicalAvgFixHours}h`} />
              <Stat icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Volume" value={`${(market.volume / 1000).toFixed(1)}k`} />
            </div>

            {/* Historical fix times line chart */}
            <div className="mt-4 border-t border-white/5 pt-3.5 no-toggle">
              <h4 className="font-display text-sm font-semibold text-white">Historical fix times · {SERVICES[market.service].label}</h4>
              <p className="mt-0.5 text-xs text-muted-foreground">Last 12 similar outages in {city.name}. Use this to bet smarter.</p>
              <div className="mt-3 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis dataKey="i" hide />
                    <YAxis hide />
                    <ChartTooltip
                      contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "oklch(0.72 0.03 260)" }}
                    />
                    <ReferenceLine y={avg} stroke="oklch(0.85 0.16 200)" strokeDasharray="3 3" label={{ value: `avg ${avg.toFixed(1)}h`, fill: "oklch(0.85 0.16 200)", fontSize: 10, position: "insideTopRight" }} />
                    <Line type="monotone" dataKey="hours" stroke="oklch(0.90 0.24 130)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.90 0.24 130)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Simulated Trend Probability Banner */}
            <div className="mt-3.5 p-3 rounded-2xl border border-white/5 bg-black/30 flex items-center justify-between gap-4 no-toggle">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Trend Probability</span>
                <span className="text-xs text-white/80 leading-snug">
                  Based on <span className="font-mono text-white font-semibold">{simulatedRuns}</span> historical {market.service.toLowerCase()} runs, there is a <span className="font-semibold text-emerald-400">{trendProb}%</span> chance of restoration meeting the estimate.
                </span>
              </div>
              <div className="shrink-0 text-right">
                <div className="inline-flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-emerald-400 font-mono text-xs font-bold">
                  {trendProb}%
                </div>
              </div>
            </div>

            {/* Options list */}
            <div className="mt-4 border-t border-white/5 pt-3.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">Place a Bet</span>
              <div className="space-y-2">
                {market.options.slice(0, 3).map((opt, i) => {
                  const disabled = state.status === "resolved";
                  const isWinner = state.outcome?.optionIndex === i;
                  return (
                    <div key={i} className="rounded-2xl border border-white/5 bg-black/20 p-3 no-toggle">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {opt.label}
                          {isWinner && <span className="ml-2 text-[10px]" style={{ color: "var(--yes)" }}>✓ Winning</span>}
                        </p>
                        <span className="font-mono text-[10px] text-muted-foreground">{opt.yesPct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full"
                          style={{ width: `${opt.yesPct}%`, background: "var(--gradient-neon)" }} />
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <BetBtn disabled={disabled} side="yes" odds={opt.yesOdds} onClick={() => setSheet({ optionIndex: i, side: "yes" })} />
                        <BetBtn disabled={disabled} side="no"  odds={opt.noOdds}  onClick={() => setSheet({ optionIndex: i, side: "no" })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <footer className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
              <Link
                to="/markets/$id" params={{ id: market.id }}
                className="text-xs font-medium underline-offset-4 hover:underline no-toggle"
                style={{ color: "var(--cyan)" }}
              >
                View analytics & history →
              </Link>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" style={{ color: "var(--neon)" }} /> Settles on scout confirmation
              </div>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[11px] text-muted-foreground"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 font-mono text-cyan-400">
                <TrendingUp className="h-3 w-3" /> {(market.volume / 1000).toFixed(1)}k vol
              </span>
              <span>·</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1">
                📈 {trendProb}% Trend
              </span>
              <span>·</span>
              <span className="font-mono text-amber-400">{market.options.length} contracts</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-0.5">
              Expand <ChevronDown className="h-3 w-3 animate-bounce" />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {sheet && (
        <BetSheet
          open={true}
          onOpenChange={(v) => !v && setSheet(null)}
          market={market}
          optionIndex={sheet.optionIndex}
          side={sheet.side}
        />
      )}
    </motion.article>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-0.5 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function BetBtn({ side, odds, onClick, disabled }: { side: "yes" | "no"; odds: number; onClick: () => void; disabled?: boolean }) {
  const isYes = side === "yes";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative overflow-hidden rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.98] disabled:opacity-40"
      style={{
        borderColor: isYes ? "oklch(0.90 0.24 130 / 0.4)" : "oklch(0.68 0.22 15 / 0.4)",
        background: isYes ? "oklch(0.90 0.24 130 / 0.10)" : "oklch(0.68 0.22 15 / 0.08)",
      }}
    >
      <span className="block text-[10px] font-bold uppercase tracking-wider"
        style={{ color: isYes ? "var(--yes)" : "var(--no)" }}>
        Bet {isYes ? "YES" : "NO"}
      </span>
      <span className="mt-0.5 block font-mono text-sm font-semibold text-foreground">
        {odds.toFixed(2)}×
      </span>
    </button>
  );
}
