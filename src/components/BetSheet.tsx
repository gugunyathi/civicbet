import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CURRENCY_META, useStore, type Currency } from "@/lib/store";
import type { Market } from "@/lib/data";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Wallet } from "lucide-react";

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
  const { balances, placeBet } = useStore();
  const [currency, setCurrency] = useState<Currency>("points");
  const [stake, setStake] = useState<number>(100);
  const option = market.options[optionIndex];
  const odds = side === "yes" ? option.yesOdds : option.noOdds;

  const bal = balances[currency];
  const meta = CURRENCY_META[currency];
  const estPayout = useMemo(() => +(stake * odds).toFixed(4), [stake, odds]);
  const profit = +(estPayout - stake).toFixed(4);
  const invalid = stake <= 0 || stake > bal;

  const confirm = () => {
    try {
      const bet = placeBet({ market, optionIndex, side, currency, stake });
      toast.success(`Bet placed — ${side.toUpperCase()} @ ${odds.toFixed(2)}×`, {
        description: `Stake ${stake} ${meta.symbol} · Est. payout ${estPayout} ${meta.symbol}`,
      });
      void bet;
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-3xl border-white/10 bg-[oklch(0.16_0.03_260)] p-0 text-foreground">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left text-base">
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Confirm bet</span>
            <div className="mt-1 flex items-center gap-2">
              {side === "yes"
                ? <CheckCircle2 className="h-5 w-5" style={{ color: "var(--yes)" }} />
                : <XCircle className="h-5 w-5" style={{ color: "var(--no)" }} />}
              <span className="text-lg font-semibold">
                {side.toUpperCase()} · {option.label}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="glass rounded-2xl p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Market</span>
              <span className="font-mono">{market.ref}</span>
            </div>
            <div className="mt-1 line-clamp-1 text-sm font-medium">{market.title}</div>
          </div>

          {/* currency picker */}
          <div>
            <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Pay with</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CURRENCY_META) as Currency[]).map(c => {
                const m = CURRENCY_META[c];
                const active = currency === c;
                return (
                  <button key={c} onClick={() => { setCurrency(c); setStake(PRESETS[c][1]); }}
                    className="rounded-2xl border p-2.5 text-left transition"
                    style={{
                      borderColor: active ? "var(--neon)" : "oklch(1 0 0 / 0.1)",
                      background: active ? "oklch(0.90 0.24 130 / 0.10)" : "oklch(1 0 0 / 0.02)",
                    }}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.chain}</div>
                    <div className="mt-0.5 text-sm font-semibold">{m.symbol}</div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Bal {balances[c].toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* stake */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Stake</span>
              <span>Balance {bal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {meta.symbol}</span>
            </div>
            <div className="glass flex items-center gap-2 rounded-2xl p-2">
              <input
                type="number" min={0} value={stake}
                onChange={e => setStake(Number(e.target.value))}
                className="w-full bg-transparent px-2 text-2xl font-semibold outline-none"
              />
              <span className="px-2 text-sm text-muted-foreground">{meta.symbol}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {PRESETS[currency].map(v => (
                <button key={v} onClick={() => setStake(v)}
                  className="flex-1 rounded-full border border-white/10 py-1.5 text-[11px] hover:bg-white/5">
                  {v}
                </button>
              ))}
              <button onClick={() => setStake(+bal.toFixed(4))}
                className="flex-1 rounded-full border border-white/10 py-1.5 text-[11px] hover:bg-white/5">Max</button>
            </div>
          </div>

          {/* summary */}
          <div className="glass grid grid-cols-3 gap-2 rounded-2xl p-3">
            <Stat label="Odds" value={`${odds.toFixed(2)}×`} />
            <Stat label="Est. payout" value={`${estPayout} ${meta.symbol}`} />
            <Stat label="Profit" value={`${profit >= 0 ? "+" : ""}${profit} ${meta.symbol}`}
              color={profit >= 0 ? "var(--yes)" : "var(--no)"} />
          </div>

          {invalid && stake > bal && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
              Insufficient {meta.symbol} balance. Convert from another currency in Wallet.
            </div>
          )}

          <button
            disabled={invalid}
            onClick={confirm}
            className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}
          >
            <Wallet className="h-4 w-4" /> Confirm & place bet
          </button>
          <p className="text-center text-[10px] text-muted-foreground">
            Settles automatically when 2 Scouts confirm the restoration.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
