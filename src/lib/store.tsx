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
  type: "bet_placed" | "bet_won" | "bet_lost" | "convert" | "deposit" | "reward";
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
  }) => Market;

  convert: (from: Currency, to: Currency, amount: number) => void;
};

const StoreCtx = createContext<Store | null>(null);
const LS_KEY = "civicbet.state.v1";

function loadState() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = typeof window !== "undefined" ? loadState() : null;

  const [profile, setProfileState] = useState<Profile>(initial?.profile ?? {
    username: "@you",
    displayName: "Civic Voter",
    bio: "Prediction citizen. Reporting outages, betting on fixes.",
    avatar: "🦉",
    location: "Johannesburg, ZA",
  });
  const [balances, setBalances] = useState<Balances>(initial?.balances ?? {
    points: 2480,
    usdc_base: 12.5,
    usdt_sol: 8.2,
  });
  const [markets, setMarkets] = useState<Market[]>(initial?.markets ?? SEED_MARKETS);
  const [marketState, setMarketState] = useState<Record<string, MarketState>>(initial?.marketState ?? {});
  const [bets, setBets] = useState<Bet[]>(initial?.bets ?? []);
  const [txs, setTxs] = useState<Tx[]>(initial?.txs ?? []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEY, JSON.stringify({ profile, balances, markets, marketState, bets, txs }));
  }, [profile, balances, markets, marketState, bets, txs]);

  const setProfile = (p: Partial<Profile>) => setProfileState(prev => ({ ...prev, ...p }));

  const getMarketState = (id: string): MarketState =>
    marketState[id] ?? { confirmations: [], status: "open" };

  const pushTx = (tx: Omit<Tx, "id" | "ts">) => {
    setTxs(prev => [{ ...tx, id: crypto.randomUUID(), ts: new Date().toISOString() }, ...prev]);
  };

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
    setBets(prev => [bet, ...prev]);
    setBalances(prev => ({ ...prev, [currency]: +(prev[currency] - stake).toFixed(6) }));
    pushTx({
      type: "bet_placed",
      currency,
      amount: -stake,
      marketId: market.id,
      betId: bet.id,
      note: `${side.toUpperCase()} @ ${odds.toFixed(2)}× · ${option.label}`,
      txHash: currency !== "points" ? mockHash(CURRENCY_META[currency].chain) : undefined,
    });
    return bet;
  };

  const settleMarket = (marketId: string, outcomeOption: number) => {
    setMarketState(prev => ({
      ...prev,
      [marketId]: {
        ...(prev[marketId] ?? { confirmations: [], status: "open" }),
        status: "resolved",
        outcome: { optionIndex: outcomeOption },
        settledAt: new Date().toISOString(),
      },
    }));
    // resolve bets
    setBets(prevBets => {
      const updated = prevBets.map(b => {
        if (b.marketId !== marketId || b.status !== "active") return b;
        const restored = true; // outcome semantic below
        const isWinner =
          b.optionIndex === outcomeOption ? b.side === "yes" : b.side === "no";
        const payout = isWinner ? +(b.stake * b.odds).toFixed(6) : 0;
        // credit winner
        if (isWinner) {
          setBalances(prev => ({ ...prev, [b.currency]: +(prev[b.currency] + payout).toFixed(6) }));
          pushTx({
            type: "bet_won",
            currency: b.currency,
            amount: payout,
            marketId,
            betId: b.id,
            note: `WON ${b.side.toUpperCase()} · ${b.optionLabel}`,
            txHash: b.currency !== "points" ? mockHash(CURRENCY_META[b.currency].chain) : undefined,
          });
        } else {
          pushTx({
            type: "bet_lost",
            currency: b.currency,
            amount: 0,
            marketId,
            betId: b.id,
            note: `LOST ${b.side.toUpperCase()} · ${b.optionLabel}`,
          });
        }
        void restored;
        return { ...b, status: isWinner ? "won" as const : "lost" as const, payout };
      });
      return updated;
    });
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
    let settled = false;
    setMarketState(prev => {
      const cur = prev[marketId] ?? { confirmations: [], status: "open" as const };
      const confirmations = [conf, ...cur.confirmations];
      // Settle when >=2 confirmations agree it was restored
      const restoredCount = confirmations.filter(c => c.restored).length;
      let status = cur.status;
      if (restoredCount >= 2 && status !== "resolved") {
        status = "resolved";
        settled = true;
      } else if (restoredCount === 1) {
        status = "pending_settlement";
      }
      return { ...prev, [marketId]: { ...cur, confirmations, status } };
    });

    // reward the scout with points
    if (input.scout === profile.username || !input.scout) {
      setBalances(prev => ({ ...prev, points: prev.points + 250 }));
      pushTx({ type: "reward", currency: "points", amount: 250, marketId, note: "Scout confirmation reward" });
    }

    if (settled) {
      // Determine winning option: the earliest time-bucket restored — pick option 0 by default
      const market = markets.find(m => m.id === marketId);
      if (market) settleMarket(marketId, 0);
    }
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
      coords: { lat: -26.2 + Math.random() * 0.4, lng: 28 + Math.random() * 0.4 },
      options: [
        { label: "Restored within 1 hour",  yesOdds: 4.2, noOdds: 1.22, yesPool: 100, noPool: 400, yesPct: 20 },
        { label: "Restored within 4 hours", yesOdds: 2.1, noOdds: 1.75, yesPool: 200, noPool: 200, yesPct: 50 },
        { label: "Takes more than 4 hours", yesOdds: 1.45, noOdds: 2.6, yesPool: 400, noPool: 150, yesPct: 70 },
      ],
    };
    setMarkets(prev => [m, ...prev]);
    setBalances(prev => ({ ...prev, points: prev.points + 500 }));
    pushTx({ type: "reward", currency: "points", amount: 500, marketId: m.id, note: `Opened market · ${input.ref}` });
    return m;
  };

  const convert: Store["convert"] = (from, to, amount) => {
    if (from === to) return;
    if (amount <= 0 || balances[from] < amount) throw new Error("Invalid amount");
    const pts = toPoints(amount, from);
    const outAmt = +fromPoints(pts, to).toFixed(6);
    setBalances(prev => ({
      ...prev,
      [from]: +(prev[from] - amount).toFixed(6),
      [to]: +(prev[to] + outAmt).toFixed(6),
    }));
    pushTx({
      type: "convert", currency: from, amount: -amount,
      note: `Convert ${amount} ${CURRENCY_META[from].symbol} → ${outAmt} ${CURRENCY_META[to].symbol}`,
      txHash: from !== "points" ? mockHash(CURRENCY_META[from].chain) : undefined,
    });
    pushTx({
      type: "convert", currency: to, amount: outAmt,
      note: `Received from conversion`,
      txHash: to !== "points" ? mockHash(CURRENCY_META[to].chain) : undefined,
    });
  };

  const value = useMemo<Store>(() => ({
    profile, setProfile,
    balances,
    markets, marketState, getMarketState,
    bets, txs,
    placeBet, submitConfirmation, createMarket, convert,
  }), [profile, balances, markets, marketState, bets, txs]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore must be inside StoreProvider");
  return s;
}
