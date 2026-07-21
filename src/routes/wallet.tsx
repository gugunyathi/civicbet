import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Coins, ArrowUpRight, ArrowDownRight, User, Search, Copy, ExternalLink, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { CURRENCY_META, RATES, useStore, type Currency } from "@/lib/store";

export const Route = createFileRoute("/wallet")({
  component: Wallet,
  head: () => ({ meta: [{ title: "Wallet — Civic.Bet" }] }),
});

function Wallet() {
  const { profile, balances, txs, convert, triggerFaucet, transfer, deposit } = useStore();
  const [from, setFrom] = useState<Currency>("points");
  const [to, setTo] = useState<Currency>("usdc_base");
  const [amount, setAmount] = useState<number>(100);
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [faucetStep, setFaucetStep] = useState(0);

  // Send states
  const [sendCurrency, setSendCurrency] = useState<Currency>("usdc_base");
  const [sendToAddress, setSendToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState<number>(10);
  const [sending, setSending] = useState(false);

  // Deposit states
  const [depCurrency, setDepCurrency] = useState<Currency>("usdc_base");
  const [depAmount, setDepAmount] = useState<number>(100);
  const [depositing, setDepositing] = useState(false);

  // Wallet history filters
  const [activeHistoryTab, setActiveHistoryTab] = useState<"all" | "transfers" | "conversions" | "bets">("all");
  const [historySearch, setHistorySearch] = useState("");

  const filteredTxs = useMemo(() => {
    return txs.filter(t => {
      // 1. Tab filter
      if (activeHistoryTab === "transfers") {
        if (t.type !== "deposit" && t.type !== "withdrawal") return false;
      } else if (activeHistoryTab === "conversions") {
        if (t.type !== "convert") return false;
      } else if (activeHistoryTab === "bets") {
        if (t.type !== "bet_placed" && t.type !== "bet_won" && t.type !== "bet_lost" && t.type !== "reward") return false;
      }

      // 2. Search filter
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(query);
        const typeMatch = t.type.toLowerCase().includes(query);
        const currencyMatch = CURRENCY_META[t.currency].symbol.toLowerCase().includes(query);
        const hashMatch = t.txHash?.toLowerCase().includes(query);
        if (!noteMatch && !typeMatch && !currencyMatch && !hashMatch) return false;
      }

      return true;
    });
  }, [txs, activeHistoryTab, historySearch]);

  const outAmount = +(amount * (RATES[from] / RATES[to])).toFixed(6);

  const doConvert = () => {
    try {
      convert(from, to, amount);
      toast.success(`Converted ${amount} ${CURRENCY_META[from].symbol} → ${outAmount} ${CURRENCY_META[to].symbol}`);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleFaucet = async () => {
    try {
      setClaimingFaucet(true);
      setFaucetStep(1); // checking passkey
      await new Promise(r => setTimeout(r, 600));
      setFaucetStep(2); // sponsoring gas
      await new Promise(r => setTimeout(r, 600));
      setFaucetStep(3); // executing smart transaction on Base
      await triggerFaucet();
      toast.success("USDC claimed successfully!", {
        description: "100.00 USDC has been minted and transferred to your Base Smart Account."
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setClaimingFaucet(false);
      setFaucetStep(0);
    }
  };

  const doSend = async () => {
    if (!sendToAddress.trim()) {
      toast.error("Please enter a recipient address");
      return;
    }
    if (sendAmount <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }
    if (balances[sendCurrency] < sendAmount) {
      toast.error(`Insufficient ${CURRENCY_META[sendCurrency].symbol} balance`);
      return;
    }
    try {
      setSending(true);
      await new Promise(r => setTimeout(r, 1200)); // Gasless Smart Session Key signing delay
      await transfer(sendCurrency, sendAmount, sendToAddress.trim());
      toast.success("Transfer successful!", {
        description: `${sendAmount} ${CURRENCY_META[sendCurrency].symbol} has been sent to ${sendToAddress.slice(0, 6)}...${sendToAddress.slice(-4)}`
      });
      setSendToAddress("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const doDeposit = async () => {
    if (depAmount <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }
    try {
      setDepositing(true);
      await new Promise(r => setTimeout(r, 600)); // Simulating confirmation
      await deposit(depCurrency, depAmount);
      toast.success("Deposit successful!", {
        description: `Successfully credited +${depAmount} ${CURRENCY_META[depCurrency].symbol} to your wallet.`
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Wallet</p>
        <h1 className="font-display mt-1 text-2xl font-bold">Balances & payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Points, USDC on Base, and USDT on Solana. Bet settlements convert automatically.</p>
      </header>

      {/* Base Smart Wallet Glowing Card */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-black/40 to-slate-900/40 p-4 shadow-[0_0_20px_rgba(0,82,255,0.15)]">
        <div className="absolute top-0 right-0 p-3 text-xs font-mono font-bold text-blue-400">
          BASE SMART ACCOUNT
        </div>
        
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
            Connected in Background (Passkey Auto-Sign)
          </span>
        </div>

        <div className="mt-3">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Address</span>
          <div className="mt-0.5 flex items-center justify-between gap-2 rounded-xl bg-black/40 border border-white/5 px-3 py-2 font-mono text-xs">
            <span className="text-foreground truncate">{profile.walletAddress || "0x..."}</span>
            <button onClick={() => {
              if (profile.walletAddress) {
                navigator.clipboard.writeText(profile.walletAddress);
                toast.success("Wallet address copied!");
              }
            }} className="text-blue-400 hover:text-blue-300 px-1 font-sans text-[11px] font-semibold">
              Copy
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Sponsor Relay</span>
            <div className="font-mono text-xs text-blue-400 font-semibold">100% Sponsored (Gasless)</div>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Transaction Execution</span>
            <div className="font-mono text-xs text-blue-400 font-semibold">Silent Session Key</div>
          </div>
        </div>

        {/* Faucet button */}
        <div className="mt-4">
          <button
            disabled={claimingFaucet}
            onClick={handleFaucet}
            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {claimingFaucet ? (
              <span className="animate-pulse">
                {faucetStep === 1 ? "Verifying Passkey..." : faucetStep === 2 ? "Sponsoring Gas..." : "Minting USDC on Base..."}
              </span>
            ) : (
              <>
                <span>🎁</span> Claim Base USDC Faucet (+100 USDC)
              </>
            )}
          </button>
        </div>
      </div>

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

      {/* Send & Deposit Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Send panel */}
        <section className="glass rounded-3xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-400">
            <ArrowUpRight className="h-4 w-4" /> Send / Withdraw Crypto
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Select Currency</div>
              <select value={sendCurrency} onChange={e => setSendCurrency(e.target.value as Currency)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none">
                <option value="usdc_base">USDC (Base)</option>
                <option value="usdt_sol">USDT (Solana)</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recipient Address</div>
              <input type="text" value={sendToAddress} onChange={e => setSendToAddress(e.target.value)}
                placeholder={sendCurrency === "usdc_base" ? "0x..." : "Solana wallet address..."}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none font-mono" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount</div>
              <div className="glass mt-1 flex items-center gap-2 rounded-xl p-2">
                <input type="number" value={sendAmount} onChange={e => setSendAmount(Number(e.target.value))}
                  className="w-full bg-transparent px-2 text-xl font-semibold outline-none" />
                <span className="pr-2 text-sm text-muted-foreground">{CURRENCY_META[sendCurrency].symbol}</span>
              </div>
            </div>
          </div>
          <button onClick={doSend} disabled={sending}
            className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition">
            {sending ? "Executing Sponsored Transfer..." : "Send Out of Wallet"}
          </button>
        </section>

        {/* Deposit panel */}
        <section className="glass rounded-3xl p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <ArrowDownRight className="h-4 w-4" /> Simulate Deposit
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Select Currency</div>
              <select value={depCurrency} onChange={e => setDepCurrency(e.target.value as Currency)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none">
                <option value="usdc_base">USDC (Base)</option>
                <option value="usdt_sol">USDT (Solana)</option>
                <option value="points">Civic Points (Off-chain)</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amount to Add</div>
              <div className="glass mt-1 flex items-center gap-2 rounded-xl p-2">
                <input type="number" value={depAmount} onChange={e => setDepAmount(Number(e.target.value))}
                  className="w-full bg-transparent px-2 text-xl font-semibold outline-none" />
                <span className="pr-2 text-sm text-muted-foreground">{CURRENCY_META[depCurrency].symbol}</span>
              </div>
            </div>
          </div>
          <button onClick={doDeposit} disabled={depositing}
            className="mt-4 w-full rounded-full py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition">
            {depositing ? "Crediting Account..." : "Simulate Deposit"}
          </button>
        </section>
      </div>

      {/* Transactions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-muted-foreground">Transaction history</h2>
            <p className="text-[10px] text-muted-foreground">Real-time smart contract & points logging</p>
          </div>
          <Link to="/profile" className="text-[11px]" style={{ color: "var(--cyan)" }}>
            <User className="mr-1 inline h-3 w-3" /> Full history & PnL →
          </Link>
        </div>

        {/* Filters and search layout */}
        <div className="space-y-2">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by note, type, address, hash..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-black/40 py-2 pl-9 pr-8 text-xs outline-none focus:border-white/10 transition"
            />
            {historySearch && (
              <button 
                onClick={() => setHistorySearch("")}
                className="absolute right-3 text-[10px] text-muted-foreground hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Interactive filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "all", label: "All Logs" },
              { id: "transfers", label: "Transfers" },
              { id: "conversions", label: "Conversions" },
              { id: "bets", label: "Bets & Rewards" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveHistoryTab(tab.id as any)}
                className={`rounded-full px-3.5 py-1 text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                  activeHistoryTab === tab.id
                    ? "bg-white text-black font-semibold shadow"
                    : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          {filteredTxs.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p>No transactions match your search or filter.</p>
              {(historySearch || activeHistoryTab !== "all") && (
                <button 
                  onClick={() => { setHistorySearch(""); setActiveHistoryTab("all"); }}
                  className="mt-2 text-[10px] underline text-cyan-400"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
          {filteredTxs.slice(0, 15).map(t => <TxRow key={t.id} tx={t} />)}
        </div>
      </section>
    </div>
  );
}

export function TxRow({ tx }: { tx: import("@/lib/store").Tx }) {
  const meta = CURRENCY_META[tx.currency];
  const positive = tx.amount > 0;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tx.txHash) {
      navigator.clipboard.writeText(tx.txHash);
      setCopied(true);
      toast.success("Transaction hash copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExplorer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tx.txHash) {
      toast.info(`Opening ${meta.chain} block explorer...`, {
        description: `Tx: ${tx.txHash.slice(0, 20)}...`
      });
    }
  };

  const getTxTypeBadge = () => {
    switch (tx.type) {
      case "bet_placed":
        return { label: "Bet Placed", color: "bg-blue-500/10 text-blue-400" };
      case "bet_won":
        return { label: "Bet Won 🏆", color: "bg-emerald-500/10 text-emerald-400" };
      case "bet_lost":
        return { label: "Bet Lost", color: "bg-red-500/10 text-red-400" };
      case "convert":
        return { label: "Swap / Convert", color: "bg-purple-500/10 text-purple-400" };
      case "deposit":
        return { label: tx.note?.includes("Faucet") ? "Faucet Claim 🎁" : "Deposit", color: "bg-teal-500/10 text-teal-400" };
      case "withdrawal":
        return { label: "Sent / Withdraw", color: "bg-rose-500/10 text-rose-400" };
      case "reward":
        return { label: "Scout Reward ✨", color: "bg-amber-500/10 text-amber-400" };
      default:
        return { label: tx.type, color: "bg-white/5 text-muted-foreground" };
    }
  };

  const badge = getTxTypeBadge();

  return (
    <div 
      onClick={() => setExpanded(!expanded)}
      className={`glass rounded-xl p-2.5 transition-all cursor-pointer hover:bg-white/[0.03] select-none ${
        expanded ? "border-white/10 ring-1 ring-white/5 bg-white/[0.01]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 shrink-0">
          {positive
            ? <ArrowDownRight className="h-4 w-4" style={{ color: "var(--yes)" }} />
            : <ArrowUpRight className="h-4 w-4" style={{ color: "var(--no)" }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white/90 truncate">
            {tx.note ?? tx.type}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span className={`rounded px-1 text-[8.5px] font-semibold uppercase ${badge.color}`}>
              {badge.label}
            </span>
            <span>·</span>
            <span>
              {new Date(tx.ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs sm:text-sm font-bold" style={{ color: positive ? "var(--yes)" : undefined }}>
            {positive ? "+" : ""}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </div>
          <div className="text-[9px] font-semibold text-muted-foreground tracking-wider uppercase">{meta.symbol}</div>
        </div>
      </div>

      {expanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2.5 overflow-hidden border-t border-white/5 pt-2 text-[10px] space-y-1.5"
        >
          <div className="grid grid-cols-2 gap-y-1 font-mono text-muted-foreground">
            <div>Transaction ID:</div>
            <div className="text-right text-white/80 truncate">{tx.id}</div>
            
            <div>Network:</div>
            <div className="text-right text-white/80">{meta.chain}</div>

            <div>Status:</div>
            <div className="text-right text-emerald-400 font-semibold flex items-center justify-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Success (Confirmed)</span>
            </div>

            <div>Gas Sponsorship:</div>
            <div className="text-right text-blue-400 font-semibold">100% Sponsored (Gasless)</div>

            {tx.marketId && (
              <>
                <div>Target Market:</div>
                <div className="text-right text-cyan-400 truncate hover:underline">
                  <Link to="/" className="no-toggle">
                    View outage prediction market
                  </Link>
                </div>
              </>
            )}
          </div>

          {tx.txHash && (
            <div className="mt-2.5 flex items-center justify-between gap-1.5 rounded-lg bg-black/40 border border-white/5 p-1.5 font-mono text-[9px]">
              <span className="truncate text-muted-foreground flex-1">{tx.txHash}</span>
              <div className="flex gap-1 shrink-0">
                <button 
                  onClick={handleCopy}
                  className="rounded bg-white/5 px-1.5 py-0.5 hover:bg-white/10 active:scale-95 text-white transition flex items-center gap-0.5"
                >
                  <Copy className="h-2.5 w-2.5" />
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
                <button 
                  onClick={handleExplorer}
                  className="rounded bg-blue-500/10 px-1.5 py-0.5 hover:bg-blue-500/20 text-blue-400 transition flex items-center gap-0.5"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  <span>Explorer</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
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
