import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MARKETS as SEED_MARKETS, type Market, type ServiceKind } from "@/lib/data";

/* -------- Types -------- */
export type Currency = "points" | "usdc_base" | "usdt_sol";

export type Balances = Record<Currency, number>;

export type Bet = {
  id: string;
  marketId: string;
  optionIndex: number;
  optionLabel: string;
  side: "yes" | "no";
  currency: Currency;
  stake: number;             // in chosen currency
  stakePoints: number;       // normalized
  odds: number;
  estPayout: number;         // in chosen currency
  status: "active" | "won" | "lost" | "refunded";
  payout?: number;
  placedAt: string;
};

export type Tx = {
  id: string;
  ts: string;
  type: "bet_placed" | "bet_won" | "bet_lost" | "convert" | "deposit" | "reward" | "withdrawal";
  currency: Currency;
  amount: number;            // signed
  note?: string;
  marketId?: string;
  betId?: string;
  txHash?: string;           // mocked chain hash for USDC/USDT
};

export type Confirmation = {
  id: string;
  scout: string;              // @handle
  restored: boolean;
  ts: string;
  proofUrl?: string;          // data URL
  notes?: string;
};

export type MarketState = {
  confirmations: Confirmation[];
  status: "open" | "pending_settlement" | "resolved";
  outcome?: { optionIndex: number };   // winning option
  settledAt?: string;
};

export type Profile = {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;             // emoji or data URL
  location: string;
  walletAddress?: string;     // Base smart account address
};

/* -------- Conversion rates (mock) -------- */
export const RATES: Record<Currency, number> = {
  points: 1,           // base
  usdc_base: 100,      // 1 USDC = 100 pts
  usdt_sol: 100,       // 1 USDT = 100 pts
};

export const CURRENCY_META: Record<Currency, { label: string; symbol: string; chain: string; color: string }> = {
  points:    { label: "Civic Points", symbol: "pts",  chain: "Off-chain",     color: "var(--neon)" },
  usdc_base: { label: "USDC",         symbol: "USDC", chain: "Base",          color: "#2775ca" },
  usdt_sol:  { label: "USDT",         symbol: "USDT", chain: "Solana",        color: "#26a17b" },
};

export const toPoints = (amount: number, c: Currency) => amount * RATES[c];
export const fromPoints = (pts: number, c: Currency) => pts / RATES[c];

/* -------- Store -------- */
type Store = {
  profile: Profile;
  setProfile: (p: Partial<Profile>) => void;

  balances: Balances;

  markets: Market[];
  trendingMarkets: Market[];
  bettedMarkets: Market[];
  marketState: Record<string, MarketState>;
  getMarketState: (id: string) => MarketState;

  bets: Bet[];
  txs: Tx[];

  placeBet: (input: {
    market: Market;
    optionIndex: number;
    side: "yes" | "no";
    currency: Currency;
    stake: number;
  }) => Bet;

  submitConfirmation: (marketId: string, input: {
    restored: boolean;
    proofUrl?: string;
    notes?: string;
    scout?: string;
  }) => { settled: boolean };

  createMarket: (input: {
    ref: string;
    service: ServiceKind;
    city: string;
    suburb: string;
    address: string;
    title: string;
    photoUrl?: string;
    coords?: { lat: number; lng: number };
  }) => Market;

  convert: (from: Currency, to: Currency, amount: number) => void;
  triggerFaucet: () => Promise<void>;
  transfer: (currency: Currency, amount: number, toAddress: string) => Promise<void>;
  deposit: (currency: Currency, amount: number) => Promise<void>;
};

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile>({
    username: "@you",
    displayName: "Civic Voter",
    bio: "Prediction citizen. Reporting outages, betting on fixes.",
    avatar: "🦉",
    location: "Johannesburg, ZA",
  });
  const [balances, setBalances] = useState<Balances>({
    points: 2480,
    usdc_base: 12.5,
    usdt_sol: 8.2,
  });
  const [markets, setMarkets] = useState<Market[]>(SEED_MARKETS);
  const [trendingMarkets, setTrendingMarkets] = useState<Market[]>(SEED_MARKETS);
  const [bettedMarkets, setBettedMarkets] = useState<Market[]>([]);
  const [marketState, setMarketState] = useState<Record<string, MarketState>>({});
  const [bets, setBets] = useState<Bet[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  // Function to load whole state from the API
  const refreshState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) setProfileState(data.profile);
        if (data.balances) setBalances(data.balances);
        if (data.markets) setMarkets(data.markets);
        if (data.trending) setTrendingMarkets(data.trending);
        if (data.betted) setBettedMarkets(data.betted);
        if (data.marketState) setMarketState(data.marketState);
        if (data.bets) setBets(data.bets);
        if (data.txs) setTxs(data.txs);
      }
    } catch (err) {
      console.error("Failed to load state from API:", err);
    }
  };

  // Load state on boot
  useEffect(() => {
    refreshState();
  }, []);

  const setProfile = (p: Partial<Profile>) => {
    // Optimistic Update
    setProfileState(prev => {
      const updated = { ...prev, ...p };
      // Save in background
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).then(refreshState);
      return updated;
    });
  };

  const getMarketState = (id: string): MarketState =>
    marketState[id] ?? { confirmations: [], status: "open" };

  const mockHash = (chain: string) => {
    const chars = "0123456789abcdef";
    const len = chain === "Solana" ? 44 : 66;
    let s = chain === "Solana" ? "" : "0x";
    for (let i = 0; i < len - s.length; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
  };

  const placeBet: Store["placeBet"] = ({ market, optionIndex, side, currency, stake }) => {
    const bal = balances[currency];
    if (stake <= 0 || stake > bal) throw new Error("Insufficient balance");
    const option = market.options[optionIndex];
    const odds = side === "yes" ? option.yesOdds : option.noOdds;
    const estPayout = +(stake * odds).toFixed(4);

    const bet: Bet = {
      id: crypto.randomUUID(),
      marketId: market.id,
      optionIndex,
      optionLabel: option.label,
      side,
      currency,
      stake,
      stakePoints: toPoints(stake, currency),
      odds,
      estPayout,
      status: "active",
      placedAt: new Date().toISOString(),
    };

    // Optimistic Update
    setBets(prev => [bet, ...prev]);
    setBalances(prev => ({ ...prev, [currency]: +(prev[currency] - stake).toFixed(6) }));
    setTxs(prev => [
      {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "bet_placed",
        currency,
        amount: -stake,
        marketId: market.id,
        betId: bet.id,
        note: `${side.toUpperCase()} @ ${odds.toFixed(2)}× · ${option.label}`,
        txHash: currency !== "points" ? mockHash(CURRENCY_META[currency].chain) : undefined,
      },
      ...prev,
    ]);

    // Send to server in background
    fetch("/api/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId: market.id,
        optionIndex,
        side,
        currency,
        stake,
      }),
    }).then(refreshState);

    return bet;
  };

  const submitConfirmation: Store["submitConfirmation"] = (marketId, input) => {
    const conf: Confirmation = {
      id: crypto.randomUUID(),
      scout: input.scout ?? profile.username,
      restored: input.restored,
      ts: new Date().toISOString(),
      proofUrl: input.proofUrl,
      notes: input.notes,
    };

    // Optimistic calculation
    const cur = marketState[marketId] ?? { confirmations: [], status: "open" as const };
    const confirmations = [conf, ...cur.confirmations];
    const restoredCount = confirmations.filter(c => c.restored).length;
    let status = cur.status;
    let settled = false;
    if (restoredCount >= 2 && status !== "resolved") {
      status = "resolved";
      settled = true;
    } else if (restoredCount === 1) {
      status = "pending_settlement";
    }

    // Update local state optimistically
    setMarketState(prev => ({
      ...prev,
      [marketId]: { ...cur, confirmations, status },
    }));

    if (input.scout === profile.username || !input.scout) {
      setBalances(prev => ({ ...prev, points: prev.points + 250 }));
      setTxs(prev => [
        {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          type: "reward",
          currency: "points" as const,
          amount: 250,
          marketId,
          note: "Scout confirmation reward",
        },
        ...prev,
      ],);
    }

    // Submit to server
    fetch("/api/confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId,
        restored: input.restored,
        notes: input.notes,
        proofUrl: input.proofUrl,
        scout: input.scout,
      }),
    }).then(refreshState);

    return { settled };
  };

  const createMarket: Store["createMarket"] = (input) => {
    const m: Market = {
      id: "m_" + Math.random().toString(36).slice(2, 8),
      ref: input.ref,
      service: input.service,
      city: input.city,
      suburb: input.suburb,
      address: input.address,
      title: input.title,
      loggedAt: new Date().toISOString(),
      status: "open",
      reporter: profile.username,
      scoutsOnSite: 0,
      historicalAvgFixHours: 6,
      volume: 0,
      coords: input.coords ?? { lat: -26.2 + Math.random() * 0.4, lng: 28 + Math.random() * 0.4 },
      options: [
        { label: "Restored within 1 hour",  yesOdds: 4.2, noOdds: 1.22, yesPool: 100, noPool: 400, yesPct: 20 },
        { label: "Restored within 4 hours", yesOdds: 2.1, noOdds: 1.75, yesPool: 200, noPool: 200, yesPct: 50 },
        { label: "Takes more than 4 hours", yesOdds: 1.45, noOdds: 2.6, yesPool: 400, noPool: 150, yesPct: 70 },
      ],
    };

    // Optimistic Update
    setMarkets(prev => [m, ...prev]);
    setBalances(prev => ({ ...prev, points: prev.points + 500 }));
    setTxs(prev => [
      {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "reward" as const,
        currency: "points" as const,
        amount: 500,
        marketId: m.id,
        note: `Opened market · ${input.ref}`,
      },
      ...prev,
    ]);

    // Send to server in background
    fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: input.ref,
        service: input.service,
        city: input.city,
        suburb: input.suburb,
        address: input.address,
        title: input.title,
        photoUrl: input.photoUrl,
        coords: m.coords,
      }),
    }).then(refreshState);

    return m;
  };

  const convert: Store["convert"] = (from, to, amount) => {
    if (from === to) return;
    if (amount <= 0 || balances[from] < amount) throw new Error("Invalid amount");
    const pts = toPoints(amount, from);
    const outAmt = +fromPoints(pts, to).toFixed(6);

    // Optimistic Update
    setBalances(prev => ({
      ...prev,
      [from]: +(prev[from] - amount).toFixed(6),
      [to]: +(prev[to] + outAmt).toFixed(6),
    }));

    setTxs(prev => [
      {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "convert" as const,
        currency: from,
        amount: -amount,
        note: `Convert ${amount} ${CURRENCY_META[from].symbol} → ${outAmt} ${CURRENCY_META[to].symbol}`,
        txHash: from !== "points" ? mockHash(CURRENCY_META[from].chain) : undefined,
      },
      {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "convert" as const,
        currency: to,
        amount: outAmt,
        note: `Received from conversion`,
        txHash: to !== "points" ? mockHash(CURRENCY_META[to].chain) : undefined,
      },
      ...prev,
    ]);

    // Send to server in background
    fetch("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, amount }),
    }).then(refreshState);
  };

  const triggerFaucet = async () => {
    try {
      const res = await fetch("/api/faucet", { method: "POST" });
      if (res.ok) {
        await refreshState();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to claim faucet");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const transfer = async (currency: Currency, amount: number, toAddress: string) => {
    if (amount <= 0 || balances[currency] < amount) throw new Error("Invalid amount or insufficient balance");
    const res = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency, amount, toAddress }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to execute transfer");
    }
    await refreshState();
  };

  const deposit = async (currency: Currency, amount: number) => {
    if (amount <= 0) throw new Error("Invalid amount");
    const res = await fetch("/api/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency, amount }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to execute deposit");
    }
    await refreshState();
  };

  const value = useMemo<Store>(() => ({
    profile, setProfile,
    balances,
    markets, trendingMarkets, bettedMarkets, marketState, getMarketState,
    bets, txs,
    placeBet, submitConfirmation, createMarket, convert, triggerFaucet, transfer, deposit,
  }), [profile, balances, markets, trendingMarkets, bettedMarkets, marketState, bets, txs]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore must be inside StoreProvider");
  return s;
}
