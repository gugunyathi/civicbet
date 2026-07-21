import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CURRENCY_META, useStore, type Currency } from "@/lib/store";
import { cityById, SERVICES, type Market } from "@/lib/data";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Wallet, Activity, Users, Coins, Info, MapPin, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  market: Market;
  optionIndex: number;
  side: "yes" | "no";
};

const PRESETS: Record<Currency, number[]> = {
  points: [50, 100, 250, 500],
  usdc_base: [1, 5, 10, 25],
  usdt_sol: [1, 5, 10, 25],
};

export function BetSheet({ open, onOpenChange, market, optionIndex, side }: Props) {
  const { balances, placeBet, getMarketState } = useStore();
  const [currency, setCurrency] = useState<Currency>("points");
  const [stake, setStake] = useState<number>(100);
  const [signingStep, setSigningStep] = useState<number>(0);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signedHash, setSignedHash] = useState<string>("");

  // Make the option and side interactive inside the modal!
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(optionIndex);
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">(side);

  const marketState = getMarketState(market.id);
  const city = cityById(market.city);
  const option = market.options[selectedOptionIndex];
  const odds = selectedSide === "yes" ? option.yesOdds : option.noOdds;

  const bal = balances[currency];
  const meta = CURRENCY_META[currency];
  const estPayout = useMemo(() => +(stake * odds).toFixed(4), [stake, odds]);
  const profit = +(estPayout - stake).toFixed(4);
  const invalid = stake <= 0 || stake > bal;

  // Generate beautiful trend history based on selected option and side
  const trendData = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < market.id.length; i++) {
      hash = market.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash) + selectedOptionIndex * 14 + (selectedSide === "yes" ? 42 : 11);
    const points = [];
    let curProb = selectedSide === "yes" ? option.yesPct : (100 - option.yesPct);
    
    // Generate 7 steps backwards in time
    for (let i = 6; i >= 0; i--) {
      const stepSeed = (seed + i * 19) % 13;
      const change = (stepSeed - 6) * 1.5; // range [-9, 9]
      const val = Math.max(15, Math.min(95, Math.round(curProb - change)));
      points.push({
        time: `${i * 3}h ago`,
        probability: val,
        odds: +(100 / val).toFixed(2)
      });
    }
    // Present
    points.push({
      time: "Now",
      probability: curProb,
      odds: odds
    });
    return points;
  }, [market.id, selectedOptionIndex, selectedSide, option.yesPct, odds]);

  const confirm = async () => {
    let mockTx = "";
    if (currency === "usdc_base") {
      setIsSigning(true);
      setSigningStep(1); // checking passkey
      
      await new Promise(r => setTimeout(r, 600));
      setSigningStep(2); // generating session keys & sponsoring gas
      
      await new Promise(r => setTimeout(r, 600));
      setSigningStep(3); // signing on Base contract
      const chars = "0123456789abcdef";
      mockTx = "0x";
      for (let i = 0; i < 64; i++) mockTx += chars[Math.floor(Math.random() * 16)];
      setSignedHash(mockTx);
      
      await new Promise(r => setTimeout(r, 600));
      setSigningStep(4); // confirmed!
      
      await new Promise(r => setTimeout(r, 400));
    }

    try {
      placeBet({ market, optionIndex: selectedOptionIndex, side: selectedSide, currency, stake });
      
      if (currency === "usdc_base") {
        toast.success(`Bet Placed (Base Gasless Smart Tx)`, {
          description: (
            <div className="space-y-1 text-left">
              <div>Stake {stake} USDC · Est. payout {estPayout} USDC</div>
              <a href={`https://basescan.org/tx/${mockTx}`} target="_blank" rel="noreferrer" className="text-cyan underline font-mono text-[10px] block mt-1" style={{ color: "var(--cyan)" }}>
                View on Basescan →
              </a>
            </div>
          )
        });
      } else {
        toast.success(`Bet placed — ${selectedSide.toUpperCase()} @ ${odds.toFixed(2)}×`, {
          description: `Stake ${stake} ${meta.symbol} · Est. payout ${estPayout} ${meta.symbol}`,
        });
      }
      
      setIsSigning(false);
      setSigningStep(0);
      onOpenChange(false);
    } catch (e) {
      setIsSigning(false);
      setSigningStep(0);
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[96dvh] md:max-h-[92dvh] overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-[#060a13] p-0 text-foreground w-full md:max-w-4xl md:mx-auto md:border-x">
        <SheetHeader className="p-5 pb-3 border-b border-white/5">
          <SheetTitle className="text-left">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Prediction Ticket</span>
            <div className="mt-1 text-lg font-bold leading-tight text-white line-clamp-1">
              {market.title}
            </div>
          </SheetTitle>
        </SheetHeader>

        {isSigning ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
            <div className="relative">
              {/* Spinning/pulsing neon circle resembling Base's style */}
              <div className="h-16 w-16 rounded-full border-4 border-dashed border-[#0052ff] animate-spin" />
              <div className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-[#0052ff] flex items-center justify-center font-bold text-white text-[10px] shadow-[0_0_15px_rgba(0,82,255,0.6)]">
                BASE
              </div>
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-display text-base font-bold">Gasless Smart Account signing...</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No wallets or extensions to pop up. Base Smart Account is executing this transaction securely in the background.
              </p>
            </div>

            <div className="w-full max-w-xs glass rounded-2xl p-4 text-left font-mono text-[11px] space-y-2.5 border-white/5 bg-black/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">1. Biometric Passkey</span>
                <span className={signingStep >= 1 ? "text-[#0052ff] font-bold animate-pulse" : "text-muted-foreground"}>
                  {signingStep > 1 ? "✓ Verified" : signingStep === 1 ? "● Requesting..." : "pending"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">2. Gas Sponsor Key</span>
                <span className={signingStep >= 2 ? "text-[#0052ff] font-bold animate-pulse" : "text-muted-foreground"}>
                  {signingStep > 2 ? "✓ Sponsored" : signingStep === 2 ? "● Generating..." : "pending"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">3. Contract Signing</span>
                <span className={signingStep >= 3 ? "text-neon font-bold animate-pulse" : "text-muted-foreground"} style={signingStep >= 3 ? {color:"var(--neon)"} : {}}>
                  {signingStep > 3 ? "✓ Signed" : signingStep === 3 ? "● Signing tx..." : "pending"}
                </span>
              </div>
              {signingStep >= 3 && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-muted-foreground text-center truncate">
                  Tx Hash: {signedHash.slice(0, 10)}...{signedHash.slice(-8)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 p-5 md:grid-cols-12 md:p-6 overflow-y-auto max-h-[calc(96dvh-80px)]">
            {/* Left side: Detailed Market Statistics & Interactive Charts */}
            <div className="space-y-4 md:col-span-6 border-b border-white/5 pb-5 md:border-b-0 md:border-r md:border-white/5 md:pr-6 md:pb-0">
              
              {/* Ref & Location */}
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                <span className="font-mono text-neon">{market.ref}</span>
                <span className="flex items-center gap-1 font-mono text-cyan-400">
                  <MapPin className="h-3 w-3" /> {market.suburb}, {city.name}
                </span>
              </div>

              {/* Interactive Contract Selection */}
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-2">Select Target Contract</span>
                <div className="grid gap-2">
                  {market.options.map((opt, i) => {
                    const isSelected = selectedOptionIndex === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedOptionIndex(i)}
                        className="w-full text-left rounded-2xl border p-3 transition-all outline-none"
                        style={{
                          borderColor: isSelected ? "var(--neon)" : "oklch(1 0 0 / 0.05)",
                          background: isSelected ? "oklch(0.90 0.24 130 / 0.08)" : "oklch(1 0 0 / 0.015)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-white/60"}`}>
                            {opt.label}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">{opt.yesPct}% YES</span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full"
                            style={{ width: `${opt.yesPct}%`, background: isSelected ? "var(--gradient-neon)" : "oklch(1 0 0 / 0.1)" }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Probability Trend Area */}
              <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">Probability Trend</span>
                    <span className="text-xs text-white/80 font-medium">Restoration chance over time</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {selectedSide === "yes" ? option.yesPct : (100 - option.yesPct)}%
                    </span>
                    <span className="text-[9px] block text-muted-foreground uppercase tracking-wider">Current Forecast</span>
                  </div>
                </div>

                {/* Sparkline Chart */}
                <div className="h-28 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.90 0.24 130)" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="oklch(0.90 0.24 130)" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, 100]} hide />
                      <ChartTooltip
                        contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }}
                        labelStyle={{ color: "oklch(0.72 0.03 260)", fontWeight: "bold" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="probability"
                        stroke="oklch(0.90 0.24 130)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#probGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Market Statistics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <Users className="h-3 w-3 text-cyan-400" />
                    <span>Scouts</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-white">
                    {market.scoutsOnSite + marketState.confirmations.length} Active
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <Activity className="h-3 w-3 text-emerald-400" />
                    <span>Avg Fix</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-white">
                    {market.historicalAvgFixHours}h
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                    <Coins className="h-3 w-3 text-neon" />
                    <span>Volume</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-white">
                    {(market.volume / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>

            </div>

            {/* Right side: Betting controls & Confirmation */}
            <div className="space-y-4 md:col-span-6 flex flex-col justify-between">
              
              {/* Interactive YES/NO Segmented Pill Control */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Your Prediction Side</span>
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setSelectedSide("yes")}
                    className={`rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 outline-none ${
                      selectedSide === "yes"
                        ? "bg-[oklch(0.75_0.14_140)] text-black shadow-lg shadow-emerald-500/10"
                        : "hover:bg-white/5 text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>YES ({option.yesOdds.toFixed(2)}x)</span>
                  </button>
                  <button
                    onClick={() => setSelectedSide("no")}
                    className={`rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 outline-none ${
                      selectedSide === "no"
                        ? "bg-[oklch(0.68_0.22_15)] text-white shadow-lg shadow-rose-500/10"
                        : "hover:bg-white/5 text-muted-foreground"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    <span>NO ({option.noOdds.toFixed(2)}x)</span>
                  </button>
                </div>
              </div>

              {/* Pay With (Currency Picker) */}
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Select Payment Method</div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CURRENCY_META) as Currency[]).map(c => {
                    const m = CURRENCY_META[c];
                    const active = currency === c;
                    return (
                      <button key={c} onClick={() => { setCurrency(c); setStake(PRESETS[c][1]); }}
                        className="rounded-xl border p-2 text-left transition outline-none"
                        style={{
                          borderColor: active ? "var(--neon)" : "oklch(1 0 0 / 0.05)",
                          background: active ? "oklch(0.90 0.24 130 / 0.08)" : "oklch(1 0 0 / 0.015)",
                        }}>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none">{m.chain}</div>
                        <div className="mt-1 text-xs font-semibold leading-none">{m.symbol}</div>
                        <div className="mt-1.5 font-mono text-[9px] text-muted-foreground leading-none">
                          Bal {balances[c].toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stake input with presets */}
              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Stake Amount</span>
                  <span>Balance {bal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {meta.symbol}</span>
                </div>
                <div className="glass flex items-center gap-2 rounded-2xl p-2 bg-black/30 border border-white/5">
                  <input
                    type="number" min={0} value={stake}
                    onChange={e => setStake(Number(e.target.value))}
                    className="w-full bg-transparent px-2 text-xl font-semibold outline-none text-white font-mono"
                  />
                  <span className="px-2 text-xs text-muted-foreground">{meta.symbol}</span>
                </div>
                <div className="mt-2 flex gap-1.5 font-mono">
                  {PRESETS[currency].map(v => (
                    <button key={v} onClick={() => setStake(v)}
                      className="flex-1 rounded-full border border-white/5 py-1 text-[10px] hover:bg-white/5 text-muted-foreground">
                      {v}
                    </button>
                  ))}
                  <button onClick={() => setStake(+bal.toFixed(4))}
                    className="flex-1 rounded-full border border-white/5 py-1 text-[10px] hover:bg-white/5 text-muted-foreground font-semibold">Max</button>
                </div>
              </div>

              {/* ROI & Summary cards */}
              <div className="glass grid grid-cols-3 gap-2 rounded-2xl p-3 bg-black/20 border border-white/5">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Odds</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-white">{odds.toFixed(2)}×</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Est. Payout</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-emerald-400">{estPayout} {meta.symbol}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Net Profit</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-cyan-400">
                    +{profit >= 0 ? profit : 0} {meta.symbol}
                  </div>
                </div>
              </div>

              {/* Insufficient balance warning */}
              {invalid && stake > bal && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                  Insufficient {meta.symbol} balance. Convert from another currency in Wallet.
                </div>
              )}

              {/* Larger, Prominent, Highly Interactive Neon Confirmation Button */}
              <div className="space-y-1.5 pt-2">
                <button
                  disabled={invalid}
                  onClick={confirm}
                  className="relative group flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold uppercase tracking-wider text-black disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                  style={{
                    background: "var(--gradient-neon)",
                    boxShadow: "0 4px 20px oklch(0.90 0.24 130 / 0.35)",
                  }}
                >
                  <Wallet className="h-4 w-4" />
                  <span>Confirm & Sign Smart Tx</span>
                </button>
                <p className="text-center text-[9px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3 text-neon" /> Gasless Transaction Sponsored by Nexus Sector
                </p>
              </div>

            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
