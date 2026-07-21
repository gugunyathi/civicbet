import { createFileRoute, Link } from "@tanstack/react-router";
import { Radar, Camera, MapPin, ShieldCheck, Zap, CheckCircle2, XCircle, Upload, Clock, Users, Coins, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cityById, SERVICES, type ServiceKind } from "@/lib/data";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { InteractiveMap } from "@/components/InteractiveMap";
import { Leaderboard } from "@/components/Leaderboard";

export const Route = createFileRoute("/scouts")({
  component: Scouts,
  head: () => ({ meta: [{ title: "Scouts — Civic.Bet" }] }),
});

function Scouts() {
  const { markets, getMarketState, profile } = useStore();
  const open = markets.filter(m => getMarketState(m.id).status !== "resolved").slice(0, 6);

  const [scoutMode, setScoutMode] = useState(false);
  const [realScouts, setRealScouts] = useState<any[]>([]);
  const [simulatedScouts, setSimulatedScouts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"jobs" | "leaderboard">("jobs");

  // 1. Initialize simulated moving scouts
  useEffect(() => {
    const names = ["Scout_Alpha", "Scout_Bravo", "Scout_Delta", "UrbanWatcher", "CityFixer"];
    const colors = ["var(--cyan)", "var(--neon)", "var(--magenta)"];
    
    // Johannesburg region base coords: lat -26.2, lng 28.0
    setSimulatedScouts(
      Array.from({ length: 4 }).map((_, i) => ({
        id: `sim_${i}`,
        username: `@${names[i]}`,
        displayName: names[i],
        lat: -26.2 + Math.random() * 0.15 - 0.075,
        lng: 28.0 + Math.random() * 0.15 - 0.075,
        targetLat: -26.2 + Math.random() * 0.15 - 0.075,
        targetLng: 28.0 + Math.random() * 0.15 - 0.075,
        color: colors[i % colors.length],
        speed: 0.002 + Math.random() * 0.003
      }))
    );
  }, []);

  // 2. Animate simulated scouts
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedScouts(prev => prev.map(s => {
        const dLat = s.targetLat - s.lat;
        const dLng = s.targetLng - s.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.005) {
          return {
            ...s,
            targetLat: -26.2 + Math.random() * 0.15 - 0.075,
            targetLng: 28.0 + Math.random() * 0.15 - 0.075,
          };
        } else {
          return {
            ...s,
            lat: s.lat + (dLat / dist) * s.speed * 0.1,
            lng: s.lng + (dLng / dist) * s.speed * 0.1,
          };
        }
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Track user's own location & post to server when Scout Mode is ON
  useEffect(() => {
    if (!scoutMode || !navigator.geolocation) return;

    let lastPost = 0;
    const reportLocation = (lat: number, lng: number) => {
      // Throttle posts to every 8 seconds
      const now = Date.now();
      if (now - lastPost < 8000) return;
      lastPost = now;

      fetch("/api/scout/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          displayName: profile.displayName,
          lat,
          lng,
        })
      }).catch(err => console.error("Error posting scout location:", err));
    };

    const onSuccess = (pos: GeolocationPosition) => {
      reportLocation(pos.coords.latitude, pos.coords.longitude);
    };

    const onError = (err: GeolocationPositionError) => {
      console.warn("Geolocation watch position error:", err);
      toast.error("Could not obtain high-accuracy GPS coordinates for live tracking.");
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
    });

    toast.success("Scout Live Tracking Mode Activated!", {
      description: "Your location is now being broadcast to other scouts.",
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [scoutMode, profile.username, profile.displayName]);

  // 4. Fetch all active scouts from server every 5 seconds
  useEffect(() => {
    const fetchScouts = () => {
      fetch("/api/scouts")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Filter out self so we don't draw our own scout pin twice (InteractiveMap already draws our live position)
            const others = data.filter((s: any) => s.username !== profile.username);
            setRealScouts(others);
          }
        })
        .catch(err => console.error("Error fetching active scouts:", err));
    };

    fetchScouts();
    const interval = setInterval(fetchScouts, 5000);
    return () => clearInterval(interval);
  }, [profile.username]);

  // Combine open incidents and active scouts as map markers
  const openMarkets = markets.filter(m => getMarketState(m.id).status !== "resolved");
  const incidentMarkers = openMarkets.map(m => {
    const serviceColors = {
      water: "var(--cyan)",
      power: "var(--neon)",
      sewage: "var(--magenta)",
      refuse: "oklch(0.68 0.22 15)"
    };
    const color = (serviceColors as any)[m.service] || "var(--neon)";
    return {
      id: `incident_${m.id}`,
      lat: m.coords?.lat ?? -26.2,
      lng: m.coords?.lng ?? 28.0,
      title: `${SERVICES[m.service as ServiceKind].label} Outage`,
      description: `${m.suburb} · ${m.address}`,
      color,
      pulse: true
    };
  });

  const scoutMarkers = [
    ...realScouts.map(s => ({
      id: `scout_${s.username}`,
      lat: s.lat,
      lng: s.lng,
      title: `${s.displayName} (Live Scout)`,
      description: s.username,
      color: "var(--cyan)",
      pulse: false,
      iconHtml: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 opacity-60 animate-ping"></span>
          <div style="
            width: 10px;
            height: 10px;
            background: var(--cyan);
            border: 1.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 8px var(--cyan);
          "></div>
        </div>
      `
    })),
    ...simulatedScouts.map(s => ({
      id: `sim_${s.id}`,
      lat: s.lat,
      lng: s.lng,
      title: `${s.displayName} (AI Scout)`,
      description: s.username,
      color: s.color,
      pulse: false,
      iconHtml: `
        <div class="relative flex items-center justify-center">
          <div style="
            width: 9px;
            height: 9px;
            background: ${s.color};
            border: 1.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 6px ${s.color};
          "></div>
        </div>
      `
    }))
  ];

  const allMarkers = [...incidentMarkers, ...scoutMarkers];

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

      {/* Modern Anti-Slop tab bar */}
      <div className="flex rounded-2xl bg-white/[0.02] p-1 border border-white/5">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "jobs"
              ? "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Radar className="h-3.5 w-3.5" />
          Incident Radar
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "leaderboard"
              ? "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          Citizen Ranks
        </button>
      </div>

      {activeTab === "jobs" ? (
        <>
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
              <button
                onClick={() => setScoutMode(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold transition-all duration-300 border ${
                  scoutMode
                    ? "bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)] animate-pulse"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${scoutMode ? "bg-cyan-400 animate-ping" : "bg-muted-foreground"}`}></span>
                {scoutMode ? "Broadcasting Location" : "Go Online as Scout"}
              </button>
            </div>
            <div className="glass overflow-hidden rounded-3xl border border-white/10 relative h-72 bg-[#050a15]">
              <InteractiveMap
                center={[-26.2, 28.0]}
                zoom={12}
                markers={allMarkers}
                showUserLocation={true}
                interactive={true}
              />
              
              {/* Map Overlay Stats */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none z-[1000]">
                <div className="flex flex-col gap-1">
                  <div className="bg-black/60 backdrop-blur px-2.5 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono">{1 + realScouts.length + simulatedScouts.length} Active</span>
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
        </>
      ) : (
        <Leaderboard />
      )}
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
