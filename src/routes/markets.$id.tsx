import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Users, Clock, ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { ServiceIcon } from "@/components/ServiceIcon";
import { MiniMap } from "@/components/MiniMap";
import { MARKETS, HISTORICAL_FIX_HOURS, cityById, marketById, SERVICES, type Market } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/markets/$id")({
  loader: ({ params }) => {
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
      { name: "description", content: loaderData ? `Bet on when ${SERVICES[loaderData.service].label.toLowerCase()} at ${loaderData.address} will be restored.` : "" },
    ],
  }),
});

function MarketDetail() {
  const m = Route.useLoaderData() as Market;
  const city = cityById(m.city);
  const history = HISTORICAL_FIX_HOURS[m.service].map((h: number, i: number) => ({ i: `#${i+1}`, hours: h }));
  const avg = history.reduce((a,x)=>a+x.hours,0) / history.length;

  return (
    <div className="space-y-5 pb-4">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

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
          <Info icon={<Users className="h-3.5 w-3.5" />} label="Scouts" value={String(m.scoutsOnSite)} />
          <Info icon={<Clock className="h-3.5 w-3.5" />} label="Avg fix" value={`${avg.toFixed(1)}h`} />
          <Info icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Volume" value={`${(m.volume/1000).toFixed(1)}k`} />
        </div>
      </header>

      {/* Options */}
      <section className="space-y-2">
        <h2 className="font-display text-sm font-semibold text-muted-foreground">Place a bet</h2>
        {m.options.map((opt, i) => (
          <div key={i} className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{opt.label}</p>
              <span className="font-mono text-[11px] text-muted-foreground">{opt.yesPct}% yes</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full" style={{ width: `${opt.yesPct}%`, background: "var(--gradient-neon)" }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => toast.success(`YES @ ${opt.yesOdds}×`)}
                className="rounded-xl border py-2.5 text-left"
                style={{ borderColor: "oklch(0.90 0.24 130 / 0.4)", background: "oklch(0.90 0.24 130 / 0.10)" }}>
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider" style={{color:"var(--yes)"}}>Bet YES</div>
                <div className="px-3 font-mono text-lg font-semibold">{opt.yesOdds.toFixed(2)}×</div>
                <div className="px-3 text-[10px] text-muted-foreground">Pool {(opt.yesPool/1000).toFixed(1)}k</div>
              </button>
              <button onClick={() => toast(`NO @ ${opt.noOdds}×`, {icon: "🚫"})}
                className="rounded-xl border py-2.5 text-left"
                style={{ borderColor: "oklch(0.68 0.22 15 / 0.4)", background: "oklch(0.68 0.22 15 / 0.08)" }}>
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider" style={{color:"var(--no)"}}>Bet NO</div>
                <div className="px-3 font-mono text-lg font-semibold">{opt.noOdds.toFixed(2)}×</div>
                <div className="px-3 text-[10px] text-muted-foreground">Pool {(opt.noPool/1000).toFixed(1)}k</div>
              </button>
            </div>
          </div>
        ))}
      </section>

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
      <Link to="/scouts" className="glass block rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Are you on site?</div>
            <div className="mt-0.5 font-display text-base font-semibold">Become a Scout · earn 250 pts</div>
          </div>
          <div className="text-2xl">📡</div>
        </div>
      </Link>
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
