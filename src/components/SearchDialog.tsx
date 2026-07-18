import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { CITIES, SERVICES, type ServiceKind } from "@/lib/data";
import { useStore } from "@/lib/store";
import { MapPin, Wallet, User, Radar, BarChart3, PlusCircle } from "lucide-react";

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const { markets } = useStore();
  const go = (fn: () => void) => { onOpenChange(false); setTimeout(fn, 30); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search markets by ref, address, city, service…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Prediction markets">
          {markets.slice(0, 12).map(m => {
            const meta = SERVICES[m.service];
            return (
              <CommandItem
                key={m.id}
                value={`${m.ref} ${m.title} ${m.suburb} ${m.service} ${m.address}`}
                onSelect={() => go(() => nav({ to: "/markets/$id", params: { id: m.id } }))}
              >
                <span className="mr-2 text-base">{meta.emoji}</span>
                <div className="flex flex-col">
                  <span className="text-sm">{m.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{m.ref} · {m.suburb}</span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Cities">
          {CITIES.map(c => (
            <CommandItem
              key={c.id}
              value={`${c.name} ${c.country}`}
              onSelect={() => go(() => nav({ to: "/", search: { city: c.id } as never }))}
            >
              <MapPin className="mr-2 h-4 w-4" style={{ color: "var(--neon)" }} />
              <span>{c.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{c.activeMarkets} live</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Services">
          {(Object.keys(SERVICES) as ServiceKind[]).map(k => (
            <CommandItem key={k} value={SERVICES[k].label} onSelect={() => go(() => nav({ to: "/" }))}>
              <span className="mr-2 text-base">{SERVICES[k].emoji}</span>{SERVICES[k].label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go(() => nav({ to: "/report" }))}><PlusCircle className="mr-2 h-4 w-4" />Report an outage</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/wallet" }))}><Wallet className="mr-2 h-4 w-4" />Open wallet</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/profile" }))}><User className="mr-2 h-4 w-4" />My profile</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/scouts" }))}><Radar className="mr-2 h-4 w-4" />Scout jobs</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/analytics" }))}><BarChart3 className="mr-2 h-4 w-4" />Insights</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
