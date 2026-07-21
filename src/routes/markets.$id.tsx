import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Users, Clock, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { ServiceIcon } from "@/components/ServiceIcon";
import { MiniMap } from "@/components/MiniMap";
import { MARKETS, HISTORICAL_FIX_HOURS, cityById, marketById, SERVICES, type Market, type ServiceKind } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { BetSheet } from "@/components/BetSheet";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/markets/$id")({
  loader: async ({ params }) => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const state = await res.json();
        const m = state.markets.find((x: any) => x.id === params.id);
        if (m) return m;
      }
    } catch (e) {
      console.error(e);
    }
    const m = marketById(params.id);
    if (!m) throw notFound();
    return m;
  },
  component: MarketDetail,
  notFoundComponent: () => (
    <div className="py-16 text-center text-sm text-muted-foreground">Market not found.</div>
  ),
  errorComponent: () => (
    <div className="py-16 text-center text-sm text-muted-foreground">Something went wrong.</div>
  ),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — Civic.Bet` : "Market — Civic.Bet" },
      { property: "og:title", content: loaderData?.title ?? "Market" },
      { name: "description", content: loaderData ? `Bet on when ${SERVICES[loaderData.service as ServiceKind].label.toLowerCase()} at ${loaderData.address} will be restored.` : "" },
    ],
  }),
});

function MarketDetail() {
  const m = Route.useLoaderData() as Market;
  const { getMarketState, bets } = useStore();
  const marketState = getMarketState(m.id);
  const isResolved = marketState.status === "resolved";
  const isPending = marketState.status === "pending_settlement";
  const winningOptionIndex = marketState.outcome?.optionIndex;

  const myBets = bets.filter(b => b.marketId === m.id);

  const city = cityById(m.city);
  const history = HISTORICAL_FIX_HOURS[m.service].map((h: number, i: number) => ({ i: `#${i+1}`, hours: h }));
  const avg = history.reduce((a,x)=>a+x.hours,0) / history.length;
  const [betParams, setBetParams] = useState<{ optionIndex: number; side: "yes" | "no" } | null>(null);

  return (
    <div className="space-y-5 pb-4">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      {isResolved && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="text-xl">🏆</div>
          <div>
            <div className="font-bold text-sm">Market Settled</div>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              Resolved to <strong className="underline">{m.options[winningOptionIndex ?? 0]?.label}</strong>. Winners paid out!
            </p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400 flex items-center gap-3 animate-pulse">
          <div className="text-xl">📡</div>
          <div>
            <div className="font-bold text-sm">Verification Pending</div>
            <p className="text-xs text-amber-400/80 mt-0.5">
              We have received 1 on-site verification. A second agreeing verification will settle this market automatically.
            </p>
          </div>
        </div>
      )}

      <header className="glass overflow-hidden rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <ServiceIcon kind={m.service} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <button onClick={() => { navigator.clipboard.writeText(m.ref); toast.success("Reference copied"); }}
                className="inline-flex items-center gap-1 font-mono text-neon" style={{color:"var(--neon)"}}>
                {m.ref} <Copy className="h-3 w-3" />
              </button>
              <span>·</span>
              <span>Logged {formatDistanceToNow(new Date(m.loggedAt), { addSuffix: true })}</span>
            </div>
            <h1 className="mt-1 font-display text-xl font-semibold leading-tight">{m.title}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">{m.address} · {city.name}</p>
          </div>
        </div>

        <MiniMap lat={m.coords.lat} lng={m.coords.lng} label={`${m.suburb}, ${city.name}`} className="mt-3 h-32 w-full" />

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Info icon={<Users className="h-3.5 w-3.5" />} label="Scouts" value={String(m.scoutsOnSite + (marketState.confirmations?.length || 0))} />
          <Info icon={<Clock className="h-3.5 w-3.5" />} label="Avg fix" value={`${avg.toFixed(1)}h`} />
          <Info icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Volume" value={`${(m.volume/1000).toFixed(1)}k`} />
        </div>
      </header>

      {/* Options */}
      <section className="space-y-2">
        <h2 className="font-display text-sm font-semibold text-muted-foreground">
          {isResolved ? "Bets Closed · Final Results" : "Place a bet"}
        </h2>
        {m.options.map((opt, i) => {
          const isWinner = isResolved && winningOptionIndex === i;
          const isLoser = isResolved && winningOptionIndex !== i;
          return (
            <div key={i} className={`glass rounded-2xl p-3 border transition-all duration-300 ${
              isWinner 
                ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                : isLoser 
                  ? "opacity-50 border-white/5" 
                  : "border-white/10"
            }`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  {opt.label}
                  {isWinner && <span className="text-emerald-400 text-xs font-bold font-mono">🏆 WINNER</span>}
                </p>
                <span className="font-mono text-[11px] text-muted-foreground">{opt.yesPct}% yes</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full" style={{ width: `${opt.yesPct}%`, background: isWinner ? "var(--yes)" : "var(--gradient-neon)" }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button 
                  disabled={isResolved || isPending}
                  onClick={() => setBetParams({ optionIndex: i, side: "yes" })}
                  className={`rounded-xl border py-2.5 text-left transition ${
                    isResolved || isPending 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:bg-white/5"
                  }`}
                  style={{ borderColor: "oklch(0.90 0.24 130 / 0.4)", background: "oklch(0.90 0.24 130 / 0.10)" }}>
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider" style={{color:"var(--yes)"}}>
                    {isResolved ? "Closed" : "Bet YES"}
                  </div>
                  <div className="px-3 font-mono text-lg font-semibold">{opt.yesOdds.toFixed(2)}×</div>
                  <div className="px-3 text-[10px] text-muted-foreground">Pool {(opt.yesPool/1000).toFixed(1)}k</div>
                </button>
                <button 
                  disabled={isResolved || isPending}
                  onClick={() => setBetParams({ optionIndex: i, side: "no" })}
                  className={`rounded-xl border py-2.5 text-left transition ${
                    isResolved || isPending 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:bg-white/5"
                  }`}
                  style={{ borderColor: "oklch(0.68 0.22 15 / 0.4)", background: "oklch(0.68 0.22 15 / 0.08)" }}>
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider" style={{color:"var(--no)"}}>
                    {isResolved ? "Closed" : "Bet NO"}
                  </div>
                  <div className="px-3 font-mono text-lg font-semibold">{opt.noOdds.toFixed(2)}×</div>
                  <div className="px-3 text-[10px] text-muted-foreground">Pool {(opt.noPool/1000).toFixed(1)}k</div>
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* User Bets on this market */}
      {myBets.length > 0 && (
        <section className="glass rounded-3xl p-4 space-y-2.5">
          <h2 className="font-display text-sm font-semibold">Your Bets on this Outage</h2>
          <div className="space-y-2">
            {myBets.map(b => (
              <div key={b.id} className="rounded-2xl border border-white/5 bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span style={{ color: b.side === "yes" ? "var(--yes)" : "var(--no)" }}>{b.side.toUpperCase()}</span>
                    <span>·</span><span>{b.odds.toFixed(2)}×</span>
                    <span>·</span><span className="font-mono">{b.currency === 'points' ? 'PTS' : b.currency === 'usdc_base' ? 'USDC' : 'USDT'}</span>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{ color: b.status === "won" ? "var(--yes)" : b.status === "lost" ? "var(--no)" : "var(--cyan)" }}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{b.optionLabel}</div>
                <div className="mt-2 flex items-center justify-between font-mono text-xs">
                  <span className="text-muted-foreground">Staked: {b.stake} {b.currency === 'points' ? 'pts' : b.currency === 'usdc_base' ? 'USDC' : 'USDT'}</span>
                  {b.status === "won" ? (
                    <span style={{ color: "var(--yes)" }} className="font-bold">Payout: +{b.payout} {b.currency === 'points' ? 'pts' : b.currency === 'usdc_base' ? 'USDC' : 'USDT'}</span>
                  ) : (
                    <span className="text-muted-foreground">Est. payout: {b.estPayout} {b.currency === 'points' ? 'pts' : b.currency === 'usdc_base' ? 'USDC' : 'USDT'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Scout Confirmations / Verifications */}
      {marketState.confirmations && marketState.confirmations.length > 0 && (
        <section className="glass rounded-3xl p-4 space-y-3">
          <h2 className="font-display text-sm font-semibold flex items-center gap-2">
            <span>📡</span> Scout Verifications ({marketState.confirmations.length})
          </h2>
          <div className="space-y-3">
            {marketState.confirmations.map((conf: any) => (
              <div key={conf.id} className="rounded-2xl border border-white/5 bg-black/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-blue-400">{conf.scout}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{formatDistanceToNow(new Date(conf.ts), { addSuffix: true })}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    conf.restored 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                  }`}>
                    {conf.restored ? "🟢 Restored" : "🔴 Still Down"}
                  </span>
                </div>
                
                {conf.notes && (
                  <p className="text-xs text-muted-foreground italic">"{conf.notes}"</p>
                )}

                {conf.proofUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-white/5 bg-black/40 h-32 w-full mt-1.5">
                    <img src={conf.proofUrl} alt="Scout proof" className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historical analytics */}
      <section className="glass rounded-3xl p-4">
        <h2 className="font-display text-sm font-semibold">Historical fix times · {SERVICES[m.service].label}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Last 12 similar outages in {city.name}. Use this to bet smarter.</p>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <XAxis dataKey="i" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "oklch(0.72 0.03 260)" }}
              />
              <ReferenceLine y={avg} stroke="oklch(0.85 0.16 200)" strokeDasharray="3 3" label={{ value: `avg ${avg.toFixed(1)}h`, fill: "oklch(0.85 0.16 200)", fontSize: 10, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="hours" stroke="oklch(0.90 0.24 130)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.90 0.24 130)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Scout CTA */}
      {!isResolved && (
        <Link to="/scouts" className="glass block rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Are you on site?</div>
              <div className="mt-0.5 font-display text-base font-semibold">Become a Scout · earn 250 pts</div>
            </div>
            <div className="text-2xl">📡</div>
          </div>
        </Link>
      )}

      {betParams && (
        <BetSheet
          open={!!betParams}
          onOpenChange={(open) => !open && setBetParams(null)}
          market={m}
          optionIndex={betParams.optionIndex}
          side={betParams.side}
        />
      )}
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-0.5 font-mono text-sm">{value}</div>
    </div>
  );
}

void MARKETS;
