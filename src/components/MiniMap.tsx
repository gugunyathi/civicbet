import { InteractiveMap } from "./InteractiveMap";

/** Interactive styled map showing the outage location alongside user location. */
export function MiniMap({
  lat, lng, label, className,
}: { lat: number; lng: number; label?: string; className?: string }) {
  return (
    <div
      className={"relative overflow-hidden rounded-xl border border-white/10 h-44 " + (className ?? "")}
    >
      <InteractiveMap
        center={[lat, lng]}
        zoom={14}
        markers={[{ id: "outage", lat, lng, title: label || "Incident Location", pulse: true }]}
        showUserLocation={true}
        interactive={true}
      />
      {label ? (
        <div className="absolute bottom-2 left-2 z-[1000] rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-white/90 backdrop-blur border border-white/10">
          {label}
        </div>
      ) : null}
    </div>
  );
}
