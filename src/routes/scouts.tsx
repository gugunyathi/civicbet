import { createFileRoute, Link } from "@tanstack/react-router";
import { Radar, Camera, MapPin, ShieldCheck, Zap, CheckCircle2, XCircle, Upload, Clock, Users, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cityById, SERVICES } from "@/lib/data";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/scouts")({
  component: Scouts,
  head: () => ({ meta: [{ title: "Scouts — Civic.Bet" }] }),
});

function Scouts() {
  const { markets, getMarketState } = useStore();
  const open = markets.filter(m => getMarketState(m.id).status !== "resolved").slice(0, 6);

  return (
    <div className="space-y-5 pb-4">
      <header className="glass overflow-hidden rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10"
            style={{ background: "var(--gradient-neon)" }}>
            <Radar className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">On-the-ground</p>
            <h1 className="font-display text-2xl font-bold">Scout program</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Scouts verify restoration on site with photo evidence. Two agreeing confirmations settle the market and pay winners automatically.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Perk icon="🎯" label="+250 pts / confirm" />
          <Perk icon="🔥" label="Streak bonuses" />
          <Perk icon="🏅" label="Trust badges" />
        </div>
      </header>

      {/* Live Scout Map */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Live Scout Map
          </h2>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded">Active Region</span>
        </div>
        <div className="glass overflow-hidden rounded-3xl border border-white/10 relative h-64 bg-[#050a15] flex items-center justify-center">
          {/* Grid lines to simulate map styling */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          
          <ScoutRadarMap />
          
          {/* Map Overlay Stats */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
            <div className="flex flex-col gap-1">
              <div className="bg-black/60 backdrop-blur px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-mono">14 Active</span>
              </div>
              <div className="bg-black/60 backdrop-blur px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                <Coins className="h-3 w-3 text-amber-400" />
                <span className="text-xs font-mono">Earning 50 pts/hr</span>
              </div>
            </div>
            
            <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-black/40 backdrop-blur-md">
              <Radar className="h-5 w-5 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold text-muted-foreground">Open jobs · confirm a restoration</h2>
        <div className="mt-2 space-y-3">
          {open.map(m => (
            <ScoutJobCard key={m.id} marketId={m.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Simulated active scouts on a map
function ScoutRadarMap() {
  const [scouts, setScouts] = useState(() => 
    Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      tx: 20 + Math.random() * 60,
      ty: 20 + Math.random() * 60,
      speed: 0.05 + Math.random() * 0.1,
      color: ["var(--cyan)", "var(--neon)", "var(--yes)"][Math.floor(Math.random() * 3)],
      name: ["Scout_Alpha", "Scout_Bravo", "Scout_Delta", "User8921", "UrbanWatcher", "CityFixer", "NightOwl", "CivicHero"][i]
    }))
  );

  useEffect(() => {
    let frameId: number;
    let lastTime = Date.now();

    const update = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setScouts(prev => prev.map(s => {
        let { x, y, tx, ty, speed } = s;
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Target reached, pick a new random target
        if (dist < 1) {
          tx = 10 + Math.random() * 80;
          ty = 10 + Math.random() * 80;
        } else {
          // Move towards target
          x += (dx / dist) * speed * 10 * dt;
          y += (dy / dist) * speed * 10 * dt;
        }

        return { ...s, x, y, tx, ty };
      }));

      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
      {scouts.map(scout => (
        <motion.div
          key={scout.id}
          className="absolute flex flex-col items-center gap-1"
          style={{ left: `${scout.x}%`, top: `${scout.y}%`, x: "-50%", y: "-50%" }}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: scout.color }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3 shadow-[0_0_10px_rgba(255,255,255,0.5)] border border-black/50" style={{ backgroundColor: scout.color }}></span>
          </span>
          <span className="text-[8px] font-mono bg-black/60 backdrop-blur px-1 py-0.5 rounded text-white/80 whitespace-nowrap">
            {scout.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function ScoutJobCard({ marketId }: { marketId: string }) {
  const { markets, getMarketState, submitConfirmation } = useStore();
  const market = markets.find(m => m.id === marketId)!;
  const state = getMarketState(marketId);
  const city = cityById(market.city);
  const [expanded, setExpanded] = useState(false);
  const [restored, setRestored] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<string | null>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 3_000_000) { toast.error("Photo must be under 3 MB"); return; }
    const r = new FileReader();
    r.onload = () => setProof(String(r.result));
    r.readAsDataURL(f);
  };

  const submit = () => {
    if (restored === null) { toast.error("Select restored or still down"); return; }
    if (!proof) { toast.error("Upload a proof photo"); return; }
    const { settled } = submitConfirmation(marketId, { restored, notes, proofUrl: proof });
    toast.success("Confirmation submitted", {
      description: settled ? "Market settled — winners paid out." : "Awaiting one more agreeing scout to settle.",
    });
    setRestored(null); setNotes(""); setProof(null); setExpanded(false);
  };

  return (
    <motion.div layout className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 p-3">
        <ServiceIcon kind={market.service} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono" style={{ color: "var(--neon)" }}>{market.ref}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(market.loggedAt), { addSuffix: true })}</span>
          </div>
          <div className="line-clamp-1 text-sm font-medium">{SERVICES[market.service].label} · {market.suburb}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" /> {city.name} · {market.address}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={state.status} count={state.confirmations.length} />
          <button
            onClick={() => setExpanded(v => !v)}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
            {expanded ? "Close" : "Confirm"}
          </button>
        </div>
      </div>

      {/* Confirmations timeline */}
      {state.confirmations.length > 0 && (
        <div className="border-t border-white/5 px-3 py-2">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Confirmation timeline</div>
          <ul className="space-y-1.5">
            {state.confirmations.map(c => (
              <li key={c.id} className="flex items-start gap-2 text-[11px]">
                {c.restored
                  ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5" style={{ color: "var(--yes)" }} />
                  : <XCircle className="mt-0.5 h-3.5 w-3.5" style={{ color: "var(--no)" }} />}
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-muted-foreground">
                    {c.scout} · <Clock className="inline h-2.5 w-2.5" /> {formatDistanceToNow(new Date(c.ts), { addSuffix: true })}
                  </div>
                  <div>{c.restored ? "Restoration confirmed" : "Still down"}{c.notes ? ` — ${c.notes}` : ""}</div>
                  {c.proofUrl && <img src={c.proofUrl} alt="proof" className="mt-1 h-14 rounded-md object-cover" />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && state.status !== "resolved" && (
        <div className="space-y-3 border-t border-white/5 p-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRestored(true)}
              className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs"
              style={{
                borderColor: restored === true ? "var(--yes)" : "oklch(1 0 0 / 0.1)",
                background: restored === true ? "oklch(0.90 0.24 130 / 0.15)" : "transparent",
                color: restored === true ? "var(--yes)" : undefined,
              }}>
              <CheckCircle2 className="h-4 w-4" /> Restored
            </button>
            <button onClick={() => setRestored(false)}
              className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs"
              style={{
                borderColor: restored === false ? "var(--no)" : "oklch(1 0 0 / 0.1)",
                background: restored === false ? "oklch(0.68 0.22 15 / 0.12)" : "transparent",
                color: restored === false ? "var(--no)" : undefined,
              }}>
              <XCircle className="h-4 w-4" /> Still down
            </button>
          </div>

          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Notes (visible to bettors)…"
            className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none" />

          {proof ? (
            <div className="relative"><img src={proof} className="max-h-40 w-full rounded-xl object-cover" alt="proof" /></div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-3 text-xs text-muted-foreground">
              <Camera className="h-4 w-4" /> Upload geo-tagged proof photo
              <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
            </label>
          )}

          <button onClick={submit}
            className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
            <Zap className="h-4 w-4" /> Submit confirmation
          </button>
        </div>
      )}
    </motion.div>
  );
}

function StatusPill({ status, count }: { status: "open" | "pending_settlement" | "resolved"; count: number }) {
  const map = {
    open: { label: `${count}/2 confirms`, color: "var(--cyan)" },
    pending_settlement: { label: `${count}/2 confirms`, color: "var(--neon)" },
    resolved: { label: "Settled", color: "var(--yes)" },
  } as const;
  const m = map[status];
  return (
    <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-wider"
      style={{ color: m.color }}>
      {m.label}
    </span>
  );
}

function Perk({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
