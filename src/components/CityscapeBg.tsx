import { motion } from "framer-motion";

/** Animated parallax cityscape backdrop — pure SVG, no assets. */
export function CityscapeBg({ intensity = 1 }: { intensity?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-city)" }}
      />
      {/* Stars */}
      <svg className="absolute inset-0 h-full w-full opacity-70" preserveAspectRatio="none">
        {Array.from({ length: 60 }).map((_, i) => (
          <circle
            key={i}
            cx={`${(i * 173) % 100}%`}
            cy={`${(i * 71) % 60}%`}
            r={Math.random() > 0.7 ? 1.4 : 0.7}
            fill="white"
            opacity={0.3 + Math.random() * 0.5}
          />
        ))}
      </svg>

      {/* Moon */}
      <motion.div
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute right-[10%] top-[8%] h-24 w-24 rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 35%, oklch(0.95 0.05 90), oklch(0.75 0.08 60))",
          boxShadow: "0 0 60px oklch(0.85 0.12 70 / 0.4)",
        }}
      />

      {/* Distant city layer */}
      <svg
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-[28%] left-0 right-0 h-[38%] w-full opacity-40"
      >
        <defs>
          <linearGradient id="far" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.35 0.10 300)" />
            <stop offset="1" stopColor="oklch(0.18 0.05 270)" />
          </linearGradient>
        </defs>
        {generateSkyline(24, 400, 40, 180).map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={400 - b.h} width={b.w} height={b.h} fill="url(#far)" />
            {b.windows.map((w, j) => (
              <rect key={j} x={b.x + w.x} y={400 - b.h + w.y} width={2} height={2}
                fill="oklch(0.85 0.15 90)" opacity={Math.random() > 0.5 ? 0.8 : 0.2} />
            ))}
          </g>
        ))}
      </svg>

      {/* Near city layer */}
      <svg
        viewBox="0 0 1200 500"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 right-0 h-[45%] w-full"
      >
        <defs>
          <linearGradient id="near" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.20 0.04 265)" />
            <stop offset="1" stopColor="oklch(0.10 0.03 260)" />
          </linearGradient>
          <linearGradient id="glow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.90 0.24 130 / 0.0)" />
            <stop offset="1" stopColor="oklch(0.90 0.24 130 / 0.15)" />
          </linearGradient>
        </defs>
        {generateSkyline(18, 500, 80, 320).map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={500 - b.h} width={b.w} height={b.h} fill="url(#near)" />
            <rect x={b.x} y={500 - b.h} width={b.w} height={b.h} fill="url(#glow)" opacity={0.6} />
            {b.windows.map((w, j) => (
              <rect key={j} x={b.x + w.x} y={500 - b.h + w.y} width={3} height={3}
                fill={Math.random() > 0.8 ? "oklch(0.90 0.24 130)" : "oklch(0.85 0.15 90)"}
                opacity={Math.random() > 0.4 ? 0.9 : 0.15} />
            ))}
            {/* antenna */}
            {i % 3 === 0 && (
              <rect x={b.x + b.w / 2 - 0.5} y={500 - b.h - 12} width={1} height={12} fill="oklch(0.90 0.24 130)" opacity={0.8} />
            )}
          </g>
        ))}
      </svg>

      {/* Neon glow strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background:
            "radial-gradient(50% 100% at 50% 100%, oklch(0.90 0.24 130 / 0.18), transparent)",
        }}
      />

      {/* Grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[18%] opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.90 0.24 130 / 0.35) 1px, transparent 1px), linear-gradient(90deg, oklch(0.90 0.24 130 / 0.25) 1px, transparent 1px)",
          backgroundSize: "40px 40px, 40px 40px",
          maskImage: "linear-gradient(180deg, transparent, black 40%)",
          transform: "perspective(400px) rotateX(60deg)",
          transformOrigin: "bottom",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, oklch(0.10 0.03 260 / 0.6))" }} />

      <style>{`:root{--intensity:${intensity}}`}</style>
    </div>
  );
}

function generateSkyline(count: number, maxHeight: number, minH: number, maxH: number) {
  const items: { x: number; w: number; h: number; windows: { x: number; y: number }[] }[] = [];
  let x = 0;
  let seed = 1;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < count; i++) {
    const w = 40 + Math.floor(rand() * 60);
    const h = minH + Math.floor(rand() * (maxH - minH));
    const windows: { x: number; y: number }[] = [];
    for (let wy = 12; wy < h - 8; wy += 10) {
      for (let wx = 6; wx < w - 6; wx += 8) {
        windows.push({ x: wx, y: wy });
      }
    }
    items.push({ x, w, h, windows });
    x += w + 4 + Math.floor(rand() * 12);
    if (x > 1200) break;
  }
  void maxHeight;
  return items;
}
