import { SERVICES, type ServiceKind } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ServiceIcon({
  kind, size = "md", className,
}: { kind: ServiceKind; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = SERVICES[kind];
  const dims = size === "lg" ? "h-14 w-14 text-2xl" : size === "sm" ? "h-8 w-8 text-base" : "h-11 w-11 text-xl";
  return (
    <div
      className={cn("relative grid place-items-center rounded-2xl border border-white/10", dims, className)}
      style={{
        background: `radial-gradient(circle at 30% 20%, ${s.color}30, ${s.color}10 60%, transparent)`,
        boxShadow: `inset 0 0 0 1px ${s.color}25, 0 0 20px ${s.color}25`,
      }}
      aria-label={s.label}
    >
      <span aria-hidden>{s.emoji}</span>
    </div>
  );
}
