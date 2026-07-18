import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, BarChart3, Radar, User, PlusCircle, Search, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CityscapeBg } from "@/components/CityscapeBg";
import { Toaster } from "@/components/ui/sonner";
import { SearchDialog } from "@/components/SearchDialog";
import { useStore, CURRENCY_META } from "@/lib/store";
import { BurgerMenu } from "@/components/BurgerMenu";

export function AppShell() {
  const { location } = useRouterState();
  const path = location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);
  const { balances } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-[100dvh] pb-24 text-foreground">
      <CityscapeBg />

      {/* Top bar with centered search */}
      <header className="sticky top-0 z-40 mx-auto flex max-w-md items-center gap-2 px-4 pt-4">
        <BurgerMenu />

        <button
          onClick={() => setSearchOpen(true)}
          className="glass group flex flex-1 items-center gap-2 rounded-full px-3 py-2 text-left text-xs text-muted-foreground transition hover:text-foreground"
          aria-label="Search markets"
        >
          <Search className="h-3.5 w-3.5" style={{ color: "var(--neon)" }} />
          <span className="flex-1 truncate">Search markets, cities, refs…</span>
          <kbd className="hidden rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] sm:inline">⌘K</kbd>
        </button>

        <Link
          to="/wallet"
          className="glass hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium sm:flex"
          aria-label="Wallet"
        >
          <Coins className="h-3.5 w-3.5" style={{ color: "var(--neon)" }} />
          <span className="font-mono">{balances.points.toLocaleString()} {CURRENCY_META.points.symbol}</span>
        </Link>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-md px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-3 z-50 mx-auto max-w-md px-4">
        <div className="glass relative flex items-center justify-around rounded-full px-2 py-2"
          style={{ boxShadow: "var(--shadow-elev)" }}>
          <NavItem to="/" active={path === "/"} icon={<Home className="h-5 w-5" />} label="Markets" />
          <NavItem to="/scouts" active={path.startsWith("/scouts")} icon={<Radar className="h-5 w-5" />} label="Scouts" />
          <ReportBtn />
          <NavItem to="/analytics" active={path.startsWith("/analytics")} icon={<BarChart3 className="h-5 w-5" />} label="Insights" />
          <NavItem to="/profile" active={path.startsWith("/profile")} icon={<User className="h-5 w-5" />} label="Profile" />
        </div>
      </nav>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}

function NavItem({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px]">
      <span style={{ color: active ? "var(--neon)" : "oklch(0.72 0.03 260)" }}>{icon}</span>
      <span style={{ color: active ? "var(--neon)" : "oklch(0.72 0.03 260)" }}>{label}</span>
      {active && (
        <motion.span layoutId="nav-dot"
          className="absolute -top-1 h-1 w-1 rounded-full"
          style={{ background: "var(--neon)", boxShadow: "0 0 8px var(--neon)" }} />
      )}
    </Link>
  );
}

function ReportBtn() {
  return (
    <Link
      to="/report"
      className="relative -mt-6 grid h-14 w-14 place-items-center rounded-full text-primary-foreground animate-pulse-glow"
      style={{ background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}
      aria-label="Report outage"
    >
      <PlusCircle className="h-6 w-6" />
    </Link>
  );
}
