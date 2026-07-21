import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SERVICES, CITIES, type ServiceKind } from "@/lib/data";
import { useStore } from "@/lib/store";
import { ArrowLeft, Sparkles, Upload, X } from "lucide-react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/report")({
  component: Report,
  head: () => ({ meta: [{ title: "Report outage — Civic.Bet" }] }),
});

function Report() {
  const router = useRouter();
  const { createMarket } = useStore();
  const [kind, setKind] = useState<ServiceKind>("water");
  const [city, setCity] = useState("jhb");
  const [reference, setReference] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: -26.2, lng: 28.0 });

  // Try to obtain the user's initial location to center the report map
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.log("Defaulting report map center to JHB:", err.message),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 3_000_000) { toast.error("Photo must be under 3 MB"); return; }
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };

  const submit = () => {
    if (!address.trim() || !suburb.trim()) { toast.error("Address & suburb required"); return; }
    const ref = reference.trim() || ("CSDFMC" + Math.floor(1_000_000 + Math.random() * 9_000_000));
    const m = createMarket({
      ref, service: kind, city, suburb, address,
      title: `${SERVICES[kind].label} outage — ${address}, ${suburb}`,
      photoUrl: photo ?? undefined,
      coords,
    });
    toast.success(`Market opened · ${ref}`, {
      description: "You earned +500 pts for creating this market.",
    });
    setTimeout(() => router.navigate({ to: "/markets/$id", params: { id: m.id } }), 500);
  };

  return (
    <AuthGate>
      <div className="space-y-5 pb-4">
        <button onClick={() => router.history.back()} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <header>
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Report → open market</p>
        <h1 className="font-display mt-1 text-2xl font-bold">Log a service outage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A new prediction market opens instantly. You earn <span style={{color:"var(--neon)"}}>+500 pts</span>.
        </p>
      </header>

      <section className="glass rounded-3xl p-4">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Service type</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(Object.keys(SERVICES) as ServiceKind[]).map(k => (
            <button key={k} onClick={() => setKind(k)}
              className="flex flex-col items-center gap-1 rounded-xl border py-2 text-[10px] transition"
              style={{
                borderColor: kind === k ? "var(--neon)" : "oklch(1 0 0 / 0.1)",
                background: kind === k ? "oklch(0.90 0.24 130 / 0.12)" : "oklch(1 0 0 / 0.03)",
              }}>
              <span className="text-lg">{SERVICES[k].emoji}</span>
              <span>{SERVICES[k].label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Reference number (from your utility / municipal ticket)">
            <Input value={reference} onChange={setReference} placeholder="e.g. CSDFMC0666261 (auto-generate if blank)" />
          </Field>
          <Field label="City">
            <select value={city} onChange={e => setCity(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none">
              {CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Suburb"><Input value={suburb} onChange={setSuburb} placeholder="e.g. Fourways" /></Field>
          <Field label="Address of issue"><Input value={address} onChange={setAddress} placeholder="e.g. Cedar Road" /></Field>
          
          <Field label="Pin Outage Location (Tap on map to reposition)">
            <div className="h-48 rounded-xl overflow-hidden border border-white/10 relative bg-black/30">
              <InteractiveMap
                center={[coords.lat, coords.lng]}
                zoom={14}
                markers={[{ id: "picker", lat: coords.lat, lng: coords.lng, title: "Outage Pin Location", pulse: true }]}
                showUserLocation={true}
                interactive={true}
                onMapClick={(newCoords) => setCoords(newCoords)}
              />
              <div className="absolute bottom-2 right-2 z-[1000] bg-black/75 backdrop-blur border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-cyan-400">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            </div>
          </Field>

          <Field label="Brief description (optional)">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Water outage since 6am, no notification…"
              className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none" />
          </Field>

          {/* Photo upload */}
          <Field label="Photo evidence (optional)">
            {photo ? (
              <div className="relative">
                <img src={photo} alt="evidence" className="max-h-56 w-full rounded-xl object-cover" />
                <button onClick={() => setPhoto(null)}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-4 text-xs text-muted-foreground hover:border-white/30">
                <Upload className="h-4 w-4" />
                Tap to upload evidence photo
                <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </Field>
        </div>
      </section>

      <button onClick={submit}
        className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}>
        <Sparkles className="h-4 w-4" /> Open prediction market
      </button>
    </div>
    </AuthGate>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground" />
  );
}
