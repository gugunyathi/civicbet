import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Coins, ArrowUpRight, ArrowDownRight, User } from "lucide-react";
import { CURRENCY_META, RATES, useStore, type Currency } from "@/lib/store";

export const Route = createFileRoute("/wallet")({
  component: Wallet,
  head: () => ({ meta: [{ title: "Wallet — Civic.Bet" }] }),
});

function Wallet() {
  const { balances, txs, convert } = useStore();
  const [from, setFrom] = useState<Currency>("points");
  const [to, setTo] = useState<Currency>("usdc_base");
  const [amount, setAmount] = useState<number>(100);

  const outAmount = +(amount * (RATES[from] / RATES[to])).toFixed(6);

  const doConvert = () => {
    try {
      convert(from, to, amount);
      toast.success(`Converted ${amount} ${CURRENCY_META[from].symbol} → ${outAmount} ${CURRENCY_META[to].symbol}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-5 pb-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Wallet</p>
        <h1 className="font-display mt-1 text-2xl font-bold">Balances & payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Points, USDC on Base, and USDT on Solana. Bet settlements convert automatically.</p>
      </header>

      {/* Balance cards */}
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(CURRENCY_META) as Currency[]).map(c => (
          <BalanceCard key={c} currency={c} />
        ))}
      </div>

      {/* Convert */}
      <section className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><ArrowLeftRight className="h-4 w-4" /> Convert</div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2">
          <CurrencySelect value={from} onChange={setFrom} label="From" />
          <div className="grid place-items-center pt-6"><ArrowLeftRight className="h-4 w-4 text-muted-foreground" /></div>
          <CurrencySelect value={to} onChange={setTo} label="To" />
        </div>
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</div>
          <div className="glass mt-1 flex items-center gap-2 rounded-xl p-2">
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
              className="w-full bg-transparent px-2 text-xl font-semibold outline-none" />
            <span className="pr-2 text-sm text-muted-foreground">{CURRENCY_META[from].symbol}</span>
          </div>
          <div className="mt-2 text-center font-mono text-xs text-muted-foreground">
            You get ≈ <span className="text-foreground">{outAmount} {CURRENCY_META[to].symbol}</span>
          </div>
        </div>
        <button onClick={doConvert}
          className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
          Convert
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          1 USDC = 1 USDT = 100 pts (mock rates for the prototype)
        </p>
      </section>

      {/* Transactions */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-muted-foreground">Transaction history</h2>
          <Link to="/profile" className="text-[11px]" style={{ color: "var(--cyan)" }}>
            <User className="mr-1 inline h-3 w-3" /> Full history →
          </Link>
        </div>
        <div className="mt-2 space-y-1.5">
          {txs.length === 0 && (
            <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">No transactions yet.</div>
          )}
          {txs.slice(0, 15).map(t => <TxRow key={t.id} tx={t} />)}
        </div>
      </section>
    </div>
  );
}

export function TxRow({ tx }: { tx: import("@/lib/store").Tx }) {
  const meta = CURRENCY_META[tx.currency];
  const positive = tx.amount > 0;
  return (
    <div className="glass flex items-center gap-3 rounded-xl p-2.5">
      <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30">
        {positive
          ? <ArrowDownRight className="h-4 w-4" style={{ color: "var(--yes)" }} />
          : <ArrowUpRight className="h-4 w-4" style={{ color: "var(--no)" }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">
          {tx.note ?? tx.type}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
          {new Date(tx.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          {tx.txHash && <> · {meta.chain} · {tx.txHash.slice(0, 6)}…{tx.txHash.slice(-4)}</>}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-sm" style={{ color: positive ? "var(--yes)" : undefined }}>
          {positive ? "+" : ""}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </div>
        <div className="text-[9px] text-muted-foreground">{meta.symbol}</div>
      </div>
    </div>
  );
}

function BalanceCard({ currency }: { currency: Currency }) {
  const { balances } = useStore();
  const meta = CURRENCY_META[currency];
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta.chain}</div>
        <Coins className="h-3.5 w-3.5" style={{ color: meta.color }} />
      </div>
      <div className="mt-1 font-display text-2xl font-bold">
        {balances[currency].toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{meta.symbol} · {meta.label}</div>
    </div>
  );
}

function CurrencySelect({ value, onChange, label }: { value: Currency; onChange: (c: Currency) => void; label: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value as Currency)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none">
        {(Object.keys(CURRENCY_META) as Currency[]).map(c => (
          <option key={c} value={c}>{CURRENCY_META[c].symbol} ({CURRENCY_META[c].chain})</option>
        ))}
      </select>
    </div>
  );
}
