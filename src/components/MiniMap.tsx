/** Tiny stylized map — no external tiles. Shows a pin over a schematic grid. */
export function MiniMap({
  lat, lng, label, className,
}: { lat: number; lng: number; label?: string; className?: string }) {
  // Deterministic pseudo-random offset from coords for visual variety
  const seed = Math.abs(Math.sin(lat * 13 + lng * 7)) * 100;
  const px = 25 + (seed % 50);
  const py = 30 + ((seed * 3) % 40);

  return (
    <div
      className={"relative overflow-hidden rounded-xl border border-white/10 " + (className ?? "")}
      style={{
        background:
          "linear-gradient(135deg, oklch(0.22 0.04 260), oklch(0.16 0.03 260))",
      }}
    >
      {/* streets */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <path d={`M0 ${py + 5} L100 ${py - 5}`} stroke="oklch(0.85 0.16 200 / 0.4)" strokeWidth="1.2" fill="none" />
        <path d={`M${px - 4} 0 L${px + 6} 100`} stroke="oklch(0.85 0.16 200 / 0.4)" strokeWidth="1.2" fill="none" />
        <path d={`M0 ${py + 22} Q50 ${py + 18} 100 ${py + 30}`} stroke="oklch(0.90 0.24 130 / 0.35)" strokeWidth="1" fill="none" />
        {/* pin */}
        <g transform={`translate(${px} ${py})`}>
          <circle r="10" fill="oklch(0.90 0.24 130 / 0.15)" />
          <circle r="5" fill="oklch(0.90 0.24 130 / 0.35)" />
          <circle r="2" fill="oklch(0.90 0.24 130)" />
        </g>
      </svg>
      {label ? (
        <div className="absolute bottom-1 left-2 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur">
          {label}
        </div>
      ) : null}
    </div>
  );
}
