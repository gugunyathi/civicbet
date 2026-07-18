import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Flame, Award } from "lucide-react";
import { LEADERBOARD } from "@/lib/data";

export const Route = createFileRoute("/rewards")({
  component: Rewards,
  head: () => ({ meta: [{ title: "Rewards — Civic.Bet" }] }),
});

const TIERS = [
  { name: "Citizen",   min: 0,      color: "oklch(0.72 0.03 260)", emoji: "🌱" },
  { name: "Watcher",   min: 2_500,  color: "oklch(0.85 0.16 200)", emoji: "👁️" },
  { name: "Scout",     min: 10_000, color: "oklch(0.90 0.24 130)", emoji: "📡" },
  { name: "Guardian",  min: 25_000, color: "oklch(0.70 0.28 340)", emoji: "🛡️" },
  { name: "Councillor",min: 50_000, color: "oklch(0.95 0.05 90)",  emoji: "🏛️" },
];

const EARN = [
  { emoji: "📣", label: "Report a new outage",       pts: 500 },
  { emoji: "📡", label: "Scout on-site confirmation", pts: 250 },
  { emoji: "✅", label: "Post restoration update",    pts: 300 },
  { emoji: "🎯", label: "Win a prediction",           pts: 100 },
  { emoji: "🔥", label: "7-day streak",               pts: 700 },
  { emoji: "🤝", label: "Invite a neighbour",         pts: 400 },
];

function Rewards() {
  const pts = 2480;
  const tier = TIERS.slice().reverse().find(t => pts >= t.min)!;
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const pct = nextTier ? Math.min(100, ((pts - tier.min) / (nextTier.min - tier.min)) * 100) : 100;

  return (
    <div className="space-y-5 pb-4">
      <header className="glass relative overflow-hidden rounded-3xl p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, oklch(0.90 0.24 130), transparent 60%)" }} />
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Your rank</p>
        <h1 className="font-display mt-1 text-3xl font-bold">
          <span className="mr-2">{tier.emoji}</span>
          <span style={{ color: tier.color }}>{tier.name}</span>
        </h1>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold" style={{ color: "var(--neon)" }}>{pts.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">pts</span>
        </div>
        {nextTier && (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-neon)" }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {(nextTier.min - pts).toLocaleString()} pts to <span style={{ color: nextTier.color }}>{nextTier.name} {nextTier.emoji}</span>
            </p>
          </>
        )}
      </header>

      <section>
        <h2 className="font-display text-sm font-semibold text-muted-foreground">Earn points by</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {EARN.map(e => (
            <div key={e.label} className="glass rounded-2xl p-3">
              <div className="text-xl">{e.emoji}</div>
              <div className="mt-1 text-xs">{e.label}</div>
              <div className="mt-1 font-mono text-sm" style={{ color: "var(--neon)" }}>+{e.pts}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4" style={{ color: "var(--neon)" }} />
          <h2 className="font-display text-sm font-semibold">Leaderboard · this month</h2>
        </div>
        <div className="mt-3 space-y-2">
          {LEADERBOARD.map(u => (
            <div key={u.rank} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg font-mono text-sm font-bold"
                style={{
                  background: u.rank <= 3 ? "var(--gradient-neon)" : "oklch(1 0 0 / 0.05)",
                  color: u.rank <= 3 ? "var(--primary-foreground)" : "oklch(0.72 0.03 260)",
                }}>
                {u.rank}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{u.handle}</div>
                <div className="text-[10px] text-muted-foreground">{u.role} · <Flame className="inline h-2.5 w-2.5" /> {u.streak} day streak</div>
              </div>
              <div className="font-mono text-sm" style={{ color: "var(--neon)" }}>{u.points.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4" style={{ color: "var(--neon)" }} />
          <h2 className="font-display text-sm font-semibold">Redeem points</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Redeem emoji="🎟️" name="Free bet 100 pts" cost="100 pts" />
          <Redeem emoji="💧" name="Water voucher"    cost="1,500 pts" />
          <Redeem emoji="🔌" name="Prepaid units"    cost="2,000 pts" />
          <Redeem emoji="🪙" name="USDC · 1 USDC"    cost="3,500 pts" />
        </div>
      </section>
    </div>
  );
}

function Redeem({ emoji, name, cost }: { emoji: string; name: string; cost: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xl">{emoji}</div>
      <div className="mt-1 text-xs font-medium">{name}</div>
      <div className="text-[10px] text-muted-foreground">{cost}</div>
    </div>
  );
}
