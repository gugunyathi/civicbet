import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, BarChart3, Radar, User, PlusCircle, Search, Coins, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CityscapeBg } from "@/components/CityscapeBg";
import { Toaster } from "@/components/ui/sonner";
import { SearchDialog } from "@/components/SearchDialog";
import { useStore, CURRENCY_META } from "@/lib/store";
import { BurgerMenu } from "@/components/BurgerMenu";
import { AuthButtonSmall } from "@/components/AuthGate";

export function AppShell() {
  const { location } = useRouterState();
  const path = location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);
  const { balances } = useStore();

  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollVisible, setIsScrollVisible] = useState(true);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Buffer of 15px to avoid rapid flickering on tiny scrolls
      if (Math.abs(currentScrollY - lastScrollY) < 15) return;

      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsScrollVisible(false);
      } else {
        setIsScrollVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
          className="glass group flex flex-1 items-center gap-1.5 rounded-full px-2.5 py-2 text-left text-xs text-muted-foreground transition hover:text-foreground min-w-0"
          aria-label="Search markets"
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--neon)" }} />
          <span className="flex-1 truncate">Search...</span>
          <kbd className="hidden rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] sm:inline">⌘K</kbd>
        </button>

        <Link
          to="/wallet"
          className="glass flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-semibold"
          aria-label="Wallet"
        >
          <Coins className="h-3.5 w-3.5" style={{ color: "var(--neon)" }} />
          <span className="font-mono text-neon" style={{ color: "var(--neon)" }}>{balances.points.toLocaleString()} pts</span>
        </Link>
        <AuthButtonSmall />
      </header>

      {/* Content */}
      <main className="mx-auto max-w-md px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom nav with slide up/down transitions & shrinking origin at bottom-right (profile area) */}
      <motion.nav 
        initial={{ y: 0, opacity: 1, scale: 1 }}
        animate={{
          y: (!isScrollVisible || isNavCollapsed) ? 100 : 0,
          opacity: (!isScrollVisible || isNavCollapsed) ? 0 : 1,
          scale: (!isScrollVisible || isNavCollapsed) ? 0.75 : 1,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        style={{ transformOrigin: "bottom right" }}
        className="fixed inset-x-0 bottom-3 z-50 mx-auto max-w-md px-4 pointer-events-none"
      >
        <div className="glass relative flex items-center justify-around rounded-full px-2 py-2 pointer-events-auto"
          style={{ boxShadow: "var(--shadow-elev)" }}>
          <NavItem to="/" active={path === "/"} icon={<Home className="h-5 w-5" />} label="Markets" />
          <NavItem to="/scouts" active={path.startsWith("/scouts")} icon={<Radar className="h-5 w-5" />} label="Scouts" />
          <ReportBtn />
          <NavItem to="/analytics" active={path.startsWith("/analytics")} icon={<BarChart3 className="h-5 w-5" />} label="Insights" />
          <NavItem to="/profile" active={path.startsWith("/profile")} icon={<User className="h-5 w-5" />} label="Profile" />
        </div>
      </motion.nav>

      {/* Floating minimize/collapse chevron trigger (right above the Profile item) */}
      <AnimatePresence>
        {!isNavCollapsed && isScrollVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 15 }}
            onClick={() => setIsNavCollapsed(true)}
            className="fixed bottom-20 right-6 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/85 text-muted-foreground hover:text-neon shadow-lg hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
            title="Minimize Navigation"
          >
            <ChevronDown className="h-4 w-4 animate-bounce" style={{ animationDuration: "3s" }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating expand/profile button when collapsed or scrolled down */}
      <AnimatePresence>
        {(isNavCollapsed || !isScrollVisible) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 50, y: 50 }}
            onClick={() => setIsNavCollapsed(false)}
            className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-black/90 text-neon shadow-[0_0_15px_rgba(235,255,0,0.3)] hover:scale-110 active:scale-95 transition-all outline-none cursor-pointer"
            style={{ boxShadow: "0 0 15px var(--neon-glow)" }}
            title="Expand Navigation"
          >
            <div className="relative">
              <User className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-neon animate-pulse" style={{ background: "var(--neon)" }} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

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
