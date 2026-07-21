import { useEffect, useState } from "react";
import { Trophy, Medal, Award, Flame, Users, Calendar, Target, CheckCircle2, ShieldCheck, Sparkles, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Scout {
  username: string;
  displayName: string;
  avatar: string;
  points: number;
  successfulPredictions: number;
  confirmationsCount: number;
  badge: string;
  isCurrentUser?: boolean;
  rank: number;
}

interface UserStats {
  points: number;
  wins: number;
  confirmations: number;
  rank: number;
  badge: string;
}

export function Leaderboard() {
  const [data, setData] = useState<Scout[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = () => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData.leaderboard || []);
        setUserStats(resData.userStats || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching leaderboard:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 10 seconds to keep synced with any changes
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-neon border-white/10" style={{ borderTopColor: "var(--neon)" }} />
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Loading Sentinel Nodes...</p>
      </div>
    );
  }

  // Calculate user XP level
  const points = userStats?.points || 0;
  const currentLevel = Math.floor(points / 1000) + 1;
  const xpInCurrentLevel = points % 1000;
  const xpNeededForNextLevel = 1000;
  const xpPercentage = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  const getRankDecoration = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: <Trophy className="h-5 w-5 text-amber-400" />,
          glow: "shadow-[0_0_15px_rgba(250,204,21,0.25)] border-amber-400/30 bg-amber-400/5",
          text: "text-amber-400",
        };
      case 2:
        return {
          icon: <Medal className="h-5 w-5 text-slate-300" />,
          glow: "shadow-[0_0_15px_rgba(203,213,225,0.2)] border-slate-300/30 bg-slate-300/5",
          text: "text-slate-300",
        };
      case 3:
        return {
          icon: <Medal className="h-5 w-5 text-amber-700" />,
          glow: "shadow-[0_0_15px_rgba(180,83,9,0.2)] border-amber-700/30 bg-amber-700/5",
          text: "text-amber-700",
        };
      default:
        return {
          icon: <span className="font-mono text-xs text-muted-foreground font-bold">#{rank}</span>,
          glow: "border-white/5 bg-white/[0.01]",
          text: "text-muted-foreground",
        };
    }
  };

  const milestones = [
    {
      title: "Genesis Scout",
      desc: "Activate live location tracking for the first time on map",
      unlocked: true,
      reward: "100 Pts",
    },
    {
      title: "Double Agent",
      desc: "Submit 2 successful on-the-ground proof verifications",
      unlocked: (userStats?.confirmations || 0) >= 2,
      reward: "Aegis Badge",
    },
    {
      title: "Oracle Core",
      desc: "Maintain over 15 correct utility outage predictions",
      unlocked: (userStats?.wins || 0) >= 15,
      reward: "Oracle Ring",
    },
    {
      title: "Sentinel Master",
      desc: "Surpass 4,000 off-chain loyalty points",
      unlocked: points >= 4000,
      reward: "Crown Shield",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. User Level & XP Summary Card (Anti-Slop flat design) */}
      <div className="glass rounded-3xl border border-white/10 p-5 bg-[#050a14] relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-neon/10 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Sentinel Level</span>
            <div className="flex items-center gap-2">
              <span className="font-display text-3xl font-black text-white">LVL {currentLevel}</span>
              <span className="rounded-full border border-neon/30 bg-neon/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neon" style={{ color: "var(--neon)", borderColor: "rgba(235,255,0,0.3)" }}>
                {userStats?.badge}
              </span>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Global Ranking</span>
            <div className="text-xl font-extrabold text-white flex items-center gap-1 justify-end">
              <Trophy className="h-4 w-4 text-neon" />
              <span>#{userStats?.rank}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
            <span>{Math.round(1000 - xpInCurrentLevel)} XP to Level {currentLevel + 1}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${xpPercentage}%`, 
                background: "var(--gradient-neon)",
                boxShadow: "0 0 8px var(--neon)" 
              }} 
            />
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="mt-5 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-0.5">Scout Points</div>
            <div className="font-mono text-lg font-black text-white">{points.toLocaleString()}</div>
          </div>
          <div className="text-center border-x border-white/5">
            <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-0.5">Predictions</div>
            <div className="font-mono text-lg font-black text-emerald-400">+{userStats?.wins} Correct</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-0.5">Verifications</div>
            <div className="font-mono text-lg font-black text-cyan-400">{userStats?.confirmations} Done</div>
          </div>
        </div>
      </div>

      {/* 2. Leaderboard Ranks list */}
      <div>
        <h2 className="font-display text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-neon" />
          Active Citizen Ranks
        </h2>

        <div className="space-y-2.5">
          {data.map((scout) => {
            const dec = getRankDecoration(scout.rank);
            const isSelf = scout.isCurrentUser;
            
            return (
              <motion.div
                key={scout.username}
                layout
                className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all ${dec.glow} ${
                  isSelf ? "border-neon/30 bg-neon/[0.04]" : ""
                }`}
                style={isSelf ? { borderColor: "rgba(235,255,0,0.25)" } : {}}
              >
                {/* Left Side: Rank + Profile */}
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg">
                    {dec.icon}
                  </div>
                  
                  {/* Avatar bubble */}
                  <div className="relative h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner">
                    {scout.avatar}
                    {isSelf && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#060a13] bg-neon animate-pulse" style={{ background: "var(--neon)" }} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">
                        {scout.displayName}
                      </span>
                      {isSelf && (
                        <span className="rounded bg-white/10 px-1 py-0.5 text-[8px] font-mono text-muted-foreground font-bold uppercase">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {scout.username}
                    </span>
                  </div>
                </div>

                {/* Right Side: Achievements & Points */}
                <div className="flex items-center gap-5 text-right">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Target className="h-3 w-3 text-emerald-400" />
                      <span className="font-mono text-xs font-semibold text-white">
                        {scout.successfulPredictions} wins
                      </span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {scout.confirmationsCount} jobs
                      </span>
                    </div>
                  </div>

                  <div className="min-w-[70px]">
                    <div className="font-mono text-sm font-black text-white">
                      {scout.points.toLocaleString()}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      Pts
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. Milestone Badges */}
      <div>
        <h2 className="font-display text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Award className="h-4 w-4 text-cyan-400" />
          Scout Milestones
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {milestones.map((m) => (
            <div
              key={m.title}
              className={`rounded-2xl border p-4 bg-white/[0.01] transition-all flex items-start gap-3 ${
                m.unlocked ? "border-emerald-500/15 bg-emerald-500/[0.01]" : "border-white/5 opacity-60"
              }`}
            >
              <div className={`mt-0.5 p-2 rounded-xl border ${
                m.unlocked 
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" 
                  : "border-white/5 bg-white/5 text-muted-foreground"
              }`}>
                {m.unlocked ? <ShieldCheck className="h-4 w-4" /> : <Award className="h-4 w-4" />}
              </div>
              
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${m.unlocked ? "text-white" : "text-white/60"}`}>
                    {m.title}
                  </span>
                  <span className={`text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${
                    m.unlocked 
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10" 
                      : "bg-white/5 text-muted-foreground border border-white/5"
                  }`}>
                    {m.unlocked ? "Unlocked" : m.reward}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {m.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
