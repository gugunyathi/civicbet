import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { MARKETS, SERVICES, CITIES, type ServiceKind } from "@/lib/data";
import { TrendingUp, Timer, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({ meta: [{ title: "City insights — Civic.Bet" }] }),
});

function Analytics() {
  const byService = (Object.keys(SERVICES) as ServiceKind[]).map(k => {
    const count = MARKETS.filter(m => m.service === k).length;
    return { name: SERVICES[k].label, count, fill: SERVICES[k].color };
  }).filter(x => x.count > 0);

  const byCity = CITIES.map(c => ({ name: c.name, active: c.activeMarkets, resolved: c.resolved }));

  const restorationTrend = Array.from({ length: 14 }).map((_, i) => ({
    day: `D${i+1}`,
    hours: 4 + Math.round(Math.sin(i / 2) * 2 + Math.random() * 2),
    resolved: 3 + Math.round(Math.cos(i / 3) * 2 + Math.random() * 3),
  }));

  return (
    <div className="space-y-5 pb-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Signal insights</p>
        <h1 className="font-display mt-1 text-2xl font-bold">Smart-city analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Aggregate resolution data feeds better bets and better service delivery.</p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Open markets" value={String(MARKETS.length)} sub="+12% wk" />
        <Kpi icon={<Timer className="h-4 w-4" />} label="Median fix" value="8.4h" sub="↓ 1.2h" />
        <Kpi icon={<ShieldCheck className="h-4 w-4" />} label="Scout accuracy" value="94%" sub="last 30d" />
        <Kpi icon={<MapPin className="h-4 w-4" />} label="Cities live" value={String(CITIES.length)} sub="ZA" />
      </div>

      <section className="glass rounded-3xl p-4">
        <h2 className="font-display text-sm font-semibold">Outages by service</h2>
        <div className="mt-2 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byService} dataKey="count" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {byService.map((s, i) => <Cell key={i} fill={s.fill} stroke="oklch(0.14 0.03 260)" />)}
              </Pie>
              <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10, color: "oklch(0.72 0.03 260)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass rounded-3xl p-4">
        <h2 className="font-display text-sm font-semibold">Resolution trend · last 14 days</h2>
        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={restorationTrend}>
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.90 0.24 130)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.90 0.24 130)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.85 0.16 200)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.85 0.16 200)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "oklch(0.72 0.03 260)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "oklch(0.72 0.03 260)", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="hours" stroke="oklch(0.90 0.24 130)" fill="url(#g1)" name="Avg fix (h)" />
              <Area type="monotone" dataKey="resolved" stroke="oklch(0.85 0.16 200)" fill="url(#g2)" name="Resolved / day" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass rounded-3xl p-4">
        <h2 className="font-display text-sm font-semibold">By city</h2>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCity} layout="vertical" barCategoryGap={8}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: "oklch(0.85 0.02 260)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="active"   fill="oklch(0.90 0.24 130)" name="Active"   radius={[4,4,4,4]} />
              <Bar dataKey="resolved" fill="oklch(0.85 0.16 200)" name="Resolved" radius={[4,4,4,4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="glass rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🧠</div>
          <div>
            <h3 className="font-display text-sm font-semibold">Prediction accuracy score</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The wisdom-of-the-crowd model shows a 71% correlation with actual restoration times over the last 90 days. Better data → smarter cities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span style={{ color: "var(--neon)" }}>{icon}</span>{label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
