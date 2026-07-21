import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CURRENCY_META, useStore, type Currency, toPoints } from "@/lib/store";
import { TxRow } from "@/routes/wallet";
import { Award, Trophy, TrendingUp, Wallet as WalletIcon, Save } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({ meta: [{ title: "Profile — Civic.Bet" }] }),
});

function Profile() {
  const { profile, setProfile, balances, bets, txs, triggerFaucet } = useStore();
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [faucetStep, setFaucetStep] = useState(0);

  const handleFaucet = async () => {
    try {
      setClaimingFaucet(true);
      setFaucetStep(1);
      await new Promise(r => setTimeout(r, 600));
      setFaucetStep(2);
      await new Promise(r => setTimeout(r, 600));
      setFaucetStep(3);
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

  // Aggregate PnL (in normalized points)
  const pnl = useMemo(() => {
    const perCurrency: Record<Currency, { staked: number; won: number; net: number }> = {
      points: { staked: 0, won: 0, net: 0 },
      usdc_base: { staked: 0, won: 0, net: 0 },
      usdt_sol: { staked: 0, won: 0, net: 0 },
    };
    let totalStakedPts = 0, totalWonPts = 0;
    for (const b of bets) {
      perCurrency[b.currency].staked += b.stake;
      totalStakedPts += b.stakePoints;
      if (b.status === "won" && b.payout) {
        perCurrency[b.currency].won += b.payout;
        totalWonPts += toPoints(b.payout, b.currency);
      }
    }
    (Object.keys(perCurrency) as Currency[]).forEach(c => {
      perCurrency[c].net = +(perCurrency[c].won - perCurrency[c].staked).toFixed(4);
    });
    return { perCurrency, netPts: +(totalWonPts - totalStakedPts).toFixed(2), totalStakedPts, totalWonPts };
  }, [bets]);

  // Cumulative PnL series over transactions (points-normalized)
  const chartData = useMemo(() => {
    let cum = 0;
    const ordered = [...txs].reverse().filter(t => t.type === "bet_placed" || t.type === "bet_won");
    return ordered.map(t => {
      const delta = t.type === "bet_won" ? toPoints(t.amount, t.currency) : toPoints(t.amount, t.currency);
      cum += delta;
      return {
        ts: new Date(t.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        pnl: +cum.toFixed(2),
      };
    });
  }, [txs]);

  const [draft, setDraft] = useState(profile);
  const activeBets = bets.filter(b => b.status === "active");
  const resolvedBets = bets.filter(b => b.status !== "active");

  const totalEarnedPoints = txs
    .filter(t => t.type === "bet_won" || t.type === "reward")
    .reduce((s, t) => s + toPoints(t.amount, t.currency), 0);

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 text-3xl"
            style={{ background: "var(--gradient-neon)" }}>
            {profile.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Civic profile</div>
            <div className="font-display text-lg font-bold">{profile.displayName}</div>
            <div className="text-xs text-muted-foreground">{profile.username} · {profile.location}</div>
            {profile.walletAddress && (
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] text-blue-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Base Balance: {balances.usdc_base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <MetricPill icon={<Trophy className="h-3 w-3" />} label="Bets" value={bets.length} />
          <MetricPill icon={<Award className="h-3 w-3" />} label="Earned" value={`${Math.round(totalEarnedPoints)} pts`} />
          <MetricPill
            icon={<TrendingUp className="h-3 w-3" />}
            label="Net PnL"
            value={`${pnl.netPts >= 0 ? "+" : ""}${pnl.netPts} pts`}
            color={pnl.netPts >= 0 ? "var(--yes)" : "var(--no)"}
          />
        </div>
      </motion.section>

      <Tabs defaultValue="bets" className="w-full">
        <TabsList className="grid w-full grid-cols-5 rounded-full bg-black/40 p-1">
          <TabsTrigger value="info" className="rounded-full text-[11px]">Info</TabsTrigger>
          <TabsTrigger value="bets" className="rounded-full text-[11px]">Bets</TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-full text-[11px]">Wallet</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full text-[11px]">History</TabsTrigger>
          <TabsTrigger value="pnl" className="rounded-full text-[11px]">PnL</TabsTrigger>
        </TabsList>

        {/* Info */}
        <TabsContent value="info" className="mt-3">
          <div className="glass space-y-3 rounded-2xl p-4">
            <Row label="Display name">
              <input value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} className={inputCls} />
            </Row>
            <Row label="Username">
              <input value={draft.username} onChange={e => setDraft({ ...draft, username: e.target.value })} className={inputCls} />
            </Row>
            <Row label="Location">
              <input value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} className={inputCls} />
            </Row>
            <Row label="Avatar (emoji)">
              <input value={draft.avatar} onChange={e => setDraft({ ...draft, avatar: e.target.value })} className={inputCls} />
            </Row>
            <Row label="Bio">
              <textarea value={draft.bio} rows={3} onChange={e => setDraft({ ...draft, bio: e.target.value })}
                className={inputCls + " resize-none"} />
            </Row>
            <button onClick={() => { setProfile(draft); toast.success("Profile updated"); }}
              className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
              <Save className="h-4 w-4" /> Save changes
            </button>
          </div>
        </TabsContent>

        {/* Bets */}
        <TabsContent value="bets" className="mt-3 space-y-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Active</div>
            <BetList bets={activeBets} empty="No active bets." />
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Resolved</div>
            <BetList bets={resolvedBets} empty="No resolved bets yet." />
          </div>
        </TabsContent>

        {/* Wallet */}
        <TabsContent value="wallet" className="mt-3 space-y-3">
          {/* Base Smart Wallet Glowing Card */}
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-black/40 to-slate-900/40 p-4 shadow-[0_0_20px_rgba(0,82,255,0.15)]">
            <div className="absolute top-0 right-0 p-3 text-xs font-mono font-bold text-blue-400">
              BASE NETWORK
            </div>
            
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
                Smart Account Connected
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
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Gas Sponsorship</span>
                <div className="font-mono text-xs text-blue-400 font-semibold">100% Sponsored (Free)</div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Security Mode</span>
                <div className="font-mono text-xs text-blue-400 font-semibold">Auto-Sign Session</div>
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

          {/* Wallet List */}
          <div className="space-y-1.5">
            {(Object.keys(CURRENCY_META) as Currency[]).map(c => (
              <div key={c} className="glass flex items-center gap-3 rounded-2xl p-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/30 text-xs font-semibold"
                  style={{ color: CURRENCY_META[c].color }}>
                  {CURRENCY_META[c].symbol.slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{CURRENCY_META[c].label}</div>
                  <div className="text-[10px] text-muted-foreground">{CURRENCY_META[c].chain}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-semibold">{balances[c].toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div className="text-[10px] text-muted-foreground">{CURRENCY_META[c].symbol}</div>
                </div>
              </div>
            ))}
          </div>

          <Link to="/wallet"
            className="mt-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
            <WalletIcon className="h-4 w-4" /> Convert & Withdraw Assets
          </Link>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-3 space-y-1.5">
          {txs.length === 0
            ? <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">No transactions yet.</div>
            : txs.map(t => <TxRow key={t.id} tx={t} />)}
        </TabsContent>

        {/* PnL */}
        <TabsContent value="pnl" className="mt-3 space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cumulative PnL (pts-normalized)</div>
            <div className="mt-1 font-display text-3xl font-bold"
              style={{ color: pnl.netPts >= 0 ? "var(--yes)" : "var(--no)" }}>
              {pnl.netPts >= 0 ? "+" : ""}{pnl.netPts} pts
            </div>
            <div className="mt-3 h-40 w-full">
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="ts" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                    <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="pnl" stroke="oklch(0.90 0.24 130)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">Place a few bets to build a PnL chart.</div>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(CURRENCY_META) as Currency[]).map(c => {
              const p = pnl.perCurrency[c];
              return (
                <div key={c} className="glass rounded-2xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{CURRENCY_META[c].symbol}</div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                    <div><div className="text-muted-foreground">Staked</div><div className="font-mono">{p.staked.toFixed(2)}</div></div>
                    <div><div className="text-muted-foreground">Won</div><div className="font-mono">{p.won.toFixed(2)}</div></div>
                    <div><div className="text-muted-foreground">Net</div>
                      <div className="font-mono" style={{ color: p.net >= 0 ? "var(--yes)" : "var(--no)" }}>
                        {p.net >= 0 ? "+" : ""}{p.net.toFixed(2)}
                      </div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function MetricPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2">
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

function BetList({ bets, empty }: { bets: import("@/lib/store").Bet[]; empty: string }) {
  if (bets.length === 0) return <div className="glass rounded-2xl p-3 text-center text-xs text-muted-foreground">{empty}</div>;
  return (
    <div className="space-y-1.5">
      {bets.map(b => {
        const meta = CURRENCY_META[b.currency];
        return (
          <Link key={b.id} to="/markets/$id" params={{ id: b.marketId }} className="glass block rounded-2xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span style={{ color: b.side === "yes" ? "var(--yes)" : "var(--no)" }}>{b.side}</span>
                  <span>·</span><span>{b.odds.toFixed(2)}×</span>
                  <span>·</span><span className="font-mono">{meta.symbol}</span>
                  <span className="ml-auto rounded-full border border-white/10 bg-black/40 px-1.5 py-0.5"
                    style={{ color: b.status === "won" ? "var(--yes)" : b.status === "lost" ? "var(--no)" : "var(--cyan)" }}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-0.5 line-clamp-1 text-sm">{b.optionLabel}</div>
                <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                  <span>Stake {b.stake} {meta.symbol}</span>
                  <span>Est {b.estPayout} {meta.symbol}</span>
                  {b.payout !== undefined && b.status === "won" && (
                    <span style={{ color: "var(--yes)" }}>+{b.payout} {meta.symbol}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
