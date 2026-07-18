import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, Settings, Bell, Shield, Palette, Trophy, History, Flame, Award, Users } from "lucide-react";
import { MarketDashboard } from "@/components/MarketDashboard";
import { useStore, CURRENCY_META } from "@/lib/store";
import { LEADERBOARD } from "@/lib/data";

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const { profile, balances, bets } = useStore();

  const wonBets = bets.filter(b => b.status === "won");
  const pointsEarned = wonBets
    .filter(b => b.currency === "points")
    .reduce((acc, b) => acc + (b.payout || 0), 0);

  // Dynamic Leaderboard Construction
  const leaderboardData = React.useMemo(() => {
    const userItem = {
      handle: profile.username,
      points: balances.points,
      role: "Predictor",
      streak: wonBets.length,
      isCurrentUser: true,
      avatar: profile.avatar,
      displayName: profile.displayName
    };

    const allUsers = [
      ...LEADERBOARD.map(u => ({ ...u, isCurrentUser: false })),
      userItem
    ];

    // Sort descending by points
    allUsers.sort((a, b) => b.points - a.points);

    // Assign rank positions based on sorted order
    return allUsers.map((u, idx) => ({
      ...u,
      rank: idx + 1
    }));
  }, [profile, balances.points, wonBets.length]);

  const currentUserRank = React.useMemo(() => {
    return leaderboardData.find(u => u.isCurrentUser)?.rank || 7;
  }, [leaderboardData]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/40 backdrop-blur hover:bg-white/10 transition-colors"
          aria-label="Open Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md bg-background/95 backdrop-blur border-r-white/10 p-0 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <SheetHeader>
            <SheetTitle className="text-left font-display text-xl flex items-center gap-2">
              <span className="text-2xl">🏙️</span> Civic.Bet
            </SheetTitle>
          </SheetHeader>
        </div>

        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col mt-2">
          <div className="px-4">
            <TabsList className="w-full grid grid-cols-3 bg-black/40 border border-white/5">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <TabsContent value="dashboard" className="mt-0 h-full">
              <MarketDashboard />
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-0 h-full space-y-5">
              {/* User Global Rank Overview Banner */}
              <div 
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-950/40 via-black/40 to-emerald-950/20 p-5 backdrop-blur-md"
                style={{
                  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
                }}
              >
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Award className="h-24 w-24 text-cyan-400 animate-pulse" />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">YOUR GLOBAL STANDING</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-black text-white">#{currentUserRank}</span>
                    <span className="text-sm font-mono text-muted-foreground">out of {leaderboardData.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your predictions have earned you <span className="text-cyan-400 font-mono font-semibold">{Math.floor(balances.points).toLocaleString()}</span> civic points. Verify outages and make accurate forecasts to climb the ranks.
                  </p>
                </div>
              </div>

              {/* Leaderboard Rankings List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider px-1">
                  <span>SCOUT / PREDICTOR</span>
                  <span>POINTS</span>
                </div>

                <div className="space-y-2">
                  {leaderboardData.map((user) => {
                    const isTopThree = user.rank <= 3;
                    const rankEmoji = user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : null;

                    return (
                      <div
                        key={user.handle}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          user.isCurrentUser
                            ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                            : "bg-black/20 border-white/5 hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Icon or Number */}
                          <div className="w-7 text-center shrink-0">
                            {rankEmoji ? (
                              <span className="text-lg">{rankEmoji}</span>
                            ) : (
                              <span className="font-mono text-xs font-bold text-muted-foreground">
                                #{user.rank}
                              </span>
                            )}
                          </div>

                          {/* Avatar / Initial */}
                          <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <span className="text-sm">
                              {user.isCurrentUser ? profile.avatar : "👤"}
                            </span>
                          </div>

                          {/* Handle and Tag */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-semibold truncate ${user.isCurrentUser ? "text-cyan-400 font-bold" : "text-white"}`}>
                                {user.isCurrentUser ? profile.displayName : user.handle}
                              </span>
                              {user.isCurrentUser && (
                                <span className="text-[8px] uppercase font-mono px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground block">
                              {user.role}
                            </span>
                          </div>
                        </div>

                        {/* Points and Streak */}
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-white block">
                            {Math.floor(user.points).toLocaleString()} <span className="text-[9px] font-sans text-muted-foreground">pts</span>
                          </span>
                          {user.streak > 0 && (
                            <span className="text-[9px] font-mono text-amber-400 inline-flex items-center gap-0.5">
                              <Flame className="h-2.5 w-2.5 fill-amber-500/20" /> {user.streak} win streak
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0 h-full space-y-6">
              
              {/* User Profile Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-2xl border border-white/20">
                    {profile.avatar}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-lg">{profile.displayName}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{profile.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" /> Total Balance</span>
                    <span className="font-mono text-cyan-400 text-lg font-bold">
                      {Math.floor(balances.points).toLocaleString()} <span className="text-xs text-muted-foreground font-sans">pts</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> Won Predictions</span>
                    <span className="font-mono text-emerald-400 text-lg font-bold">
                      {Math.floor(pointsEarned).toLocaleString()} <span className="text-xs text-muted-foreground font-sans">pts</span>
                    </span>
                  </div>
                </div>

                {/* Brief History of Past Bets */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Recent Bets
                  </h4>
                  <div className="space-y-2">
                    {bets.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center bg-black/10 rounded-xl border border-dashed border-white/5">
                        No bets placed yet.
                      </div>
                    ) : (
                      bets.slice(0, 3).map(bet => (
                        <div key={bet.id} className="p-3 rounded-xl bg-black/20 border border-white/5 flex flex-col gap-1.5">
                          <div className="flex items-start justify-between text-xs">
                            <span className="text-white font-medium line-clamp-1 pr-2">{bet.optionLabel}</span>
                            <span className={`font-mono shrink-0 uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded border ${
                              bet.status === "won" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              bet.status === "lost" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-white/5 text-muted-foreground border-white/10"
                            }`}>
                              {bet.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                            <span>{bet.side.toUpperCase()} @ {bet.odds.toFixed(2)}×</span>
                            <span>{bet.stake} {CURRENCY_META[bet.currency].symbol}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-white/5" />

              <div className="space-y-4">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Preferences</h3>
                
                <div className="space-y-2">
                  <SettingRow icon={<Bell className="h-4 w-4" />} title="Notifications" description="Manage alerts for new outages" />
                  <SettingRow icon={<Palette className="h-4 w-4" />} title="Appearance" description="Dark mode, system theme" />
                  <SettingRow icon={<Shield className="h-4 w-4" />} title="Privacy" description="Data sharing and location" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Account</h3>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 rounded-xl bg-black/20 hover:bg-white/5 border border-white/5 transition-colors text-sm text-red-400">
                    Sign Out
                  </button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
      <div className="p-2 rounded-lg bg-white/5 text-muted-foreground">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-medium text-white">{title}</h4>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
