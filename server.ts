import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
// Dynamic database selection: Use Firestore if config file or environment variables exist, fallback to local_db.json
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const hasFirebase = fs.existsSync(configPath) || !!process.env.FIREBASE_API_KEY || !!process.env.FIREBASE_CONFIG;

let db: any;
let collection: any;
let doc: any;
let getDocs: any;
let getDoc: any;
let setDoc: any;
let writeBatch: any;

async function fetchFullState() {
  // Profile
  const profileDoc = await getDoc(doc(db, "global", "profile"));
  let profile = {
    username: "@you",
    displayName: "Civic Voter",
    bio: "Prediction citizen. Reporting outages, betting on fixes.",
    avatar: "🦉",
    location: "Johannesburg, ZA",
    walletAddress: "",
  };
  if (profileDoc.exists()) {
    profile = { ...profile, ...profileDoc.data() };
  }

  // Auto-create Base Smart Wallet Address if none exists
  if (!profile.walletAddress) {
    const chars = "0123456789abcdef";
    let addr = "0x";
    for (let i = 0; i < 40; i++) {
      addr += chars[Math.floor(Math.random() * 16)];
    }
    profile.walletAddress = addr;
    await setDoc(doc(db, "global", "profile"), profile);
  }

  // Balances
  const balancesDoc = await getDoc(doc(db, "global", "balances"));
  let balances = {
    points: 2480,
    usdc_base: 12.5,
    usdt_sol: 8.2,
  };
  if (balancesDoc.exists()) {
    balances = balancesDoc.data() as typeof balances;
  } else {
    await setDoc(doc(db, "global", "balances"), balances);
  }

  // Markets
  const marketsCol = await getDocs(collection(db, "markets"));
  let markets: any[] = [];
  if (marketsCol.empty) {
    // Seed markets
    const { MARKETS } = await import("./src/lib/data.ts");
    const batch = writeBatch(db);
    for (const m of MARKETS) {
      const ref = doc(db, "markets", m.id);
      batch.set(ref, m);
      markets.push(m);
    }
    await batch.commit();
  } else {
    markets = marketsCol.docs.map((d: any) => d.data());
  }
  // Sort markets by loggedAt desc
  markets.sort((a: any, b: any) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  // MarketState
  const marketStateCol = await getDocs(collection(db, "marketState"));
  const marketState: Record<string, any> = {};
  marketStateCol.forEach((docItem: any) => {
    marketState[docItem.id] = docItem.data();
  });

  // Bets
  const betsCol = await getDocs(collection(db, "bets"));
  const bets = betsCol.docs.map((d: any) => d.data());
  bets.sort((a: any, b: any) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  // Txs
  const txsCol = await getDocs(collection(db, "txs"));
  const txs = txsCol.docs.map((d: any) => d.data());
  txs.sort((a: any, b: any) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // Compute trending and betted markets
  const trending = markets.filter((m: any) => !bets.some((b: any) => b.marketId === m.id));
  const betted = markets.filter((m: any) => bets.some((b: any) => b.marketId === m.id));

  return { profile, balances, markets, marketState, bets, txs, trending, betted };
}

async function startServer() {
  if (hasFirebase) {
    let firebaseConfig: any;
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } else if (process.env.FIREBASE_CONFIG) {
      try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch (e) {
        console.error("Failed to parse FIREBASE_CONFIG environment variable:", e);
        firebaseConfig = {};
      }
    } else {
      firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID,
      };
    }

    const { initializeApp } = await import("firebase/app");
    const { getFirestore, collection: fCollection, doc: fDoc, getDocs: fGetDocs, getDoc: fGetDoc, setDoc: fSetDoc, writeBatch: fWriteBatch } = await import("firebase/firestore");

    const firebaseApp = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });

    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");
    collection = fCollection;
    doc = fDoc;
    getDocs = fGetDocs;
    getDoc = fGetDoc;
    setDoc = fSetDoc;
    writeBatch = fWriteBatch;
  } else {
    // Mock Firebase using local_db.json
    const dbPath = path.join(process.cwd(), "local_db.json");
    const loadLocalDB = () => {
      if (fs.existsSync(dbPath)) {
        try {
          return JSON.parse(fs.readFileSync(dbPath, "utf8"));
        } catch (e) {
          console.error("Failed to parse local_db.json, recreating...", e);
        }
      }
      return {
        global: {
          profile: {
            username: "@you",
            displayName: "Civic Voter",
            bio: "Prediction citizen. Reporting outages, betting on fixes.",
            avatar: "🦉",
            location: "Johannesburg, ZA",
            walletAddress: ""
          },
          balances: {
            points: 2480,
            usdc_base: 12.5,
            usdt_sol: 8.2
          }
        },
        markets: {},
        marketState: {},
        bets: {},
        txs: {},
        scouts_active: {}
      };
    };

    const saveLocalDB = (data: any) => {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
    };

    // Ensure file exists
    let localData = loadLocalDB();
    saveLocalDB(localData);

    db = { _type: "mock_db" };

    collection = (database: any, colName: string) => {
      return { _type: "collection", col: colName };
    };

    doc = (database: any, colName: string, docId?: string) => {
      return { _type: "doc", col: colName, id: docId };
    };

    getDoc = async (docRef: any) => {
      const data = loadLocalDB();
      const col = data[docRef.col] || {};
      const exists = docRef.id in col;
      const docData = col[docRef.id];
      return {
        exists: () => exists,
        data: () => docData ? JSON.parse(JSON.stringify(docData)) : undefined,
      };
    };

    setDoc = async (docRef: any, docData: any) => {
      const data = loadLocalDB();
      if (!data[docRef.col]) {
        data[docRef.col] = {};
      }
      data[docRef.col][docRef.id] = JSON.parse(JSON.stringify(docData));
      saveLocalDB(data);
    };

    getDocs = async (colRef: any) => {
      const data = loadLocalDB();
      const col = data[colRef.col] || {};
      const docs = Object.keys(col).map(id => ({
        ref: { _type: "doc", col: colRef.col, id },
        id,
        data: () => JSON.parse(JSON.stringify(col[id])),
      }));
      return {
        empty: docs.length === 0,
        docs,
        forEach: (callback: (d: any) => void) => {
          docs.forEach(callback);
        },
      };
    };

    writeBatch = (database: any) => {
      const ops: Array<{ type: string; docRef: any; docData?: any }> = [];
      return {
        set: (docRef: any, docData: any) => {
          ops.push({ type: "set", docRef, docData });
        },
        delete: (docRef: any) => {
          ops.push({ type: "delete", docRef });
        },
        commit: async () => {
          const data = loadLocalDB();
          for (const op of ops) {
            if (op.type === "set") {
              if (!data[op.docRef.col]) data[op.docRef.col] = {};
              data[op.docRef.col][op.docRef.id] = JSON.parse(JSON.stringify(op.docData));
            } else if (op.type === "delete") {
              if (data[op.docRef.col]) {
                delete data[op.docRef.col][op.docRef.id];
              }
            }
          }
          saveLocalDB(data);
        },
      };
    };
  }

  const app = express();
  app.use(express.json());

  // API Route: Get full state
  app.get("/api/state", async (req, res) => {
    try {
      const state = await fetchFullState();
      res.json(state);
    } catch (err: any) {
      console.error("Error in /api/state:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get trending markets (markets with no bets placed by the user)
  app.get("/api/markets/trending", async (req, res) => {
    try {
      const state = await fetchFullState();
      res.json(state.trending);
    } catch (err: any) {
      console.error("Error in /api/markets/trending:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get betted markets (markets with bets placed by the user)
  app.get("/api/markets/betted", async (req, res) => {
    try {
      const state = await fetchFullState();
      res.json(state.betted);
    } catch (err: any) {
      console.error("Error in /api/markets/betted:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get Citizen Scout Leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const state = await fetchFullState();
      const profile = state.profile;
      const balances = state.balances;
      const bets = state.bets;
      const marketState = state.marketState;

      // Calculate user's active/completed wins
      const userWins = bets.filter((b: any) => b.status === "won").length;
      
      // Calculate user's scout confirmation counts
      let userConfirmations = 0;
      Object.values(marketState).forEach((mState: any) => {
        if (mState.confirmations) {
          userConfirmations += mState.confirmations.filter((c: any) => c.scout === profile.username).length;
        }
      });

      // Default seed scouts
      const seedScouts = [
        {
          username: "@Scout_Alpha",
          displayName: "Scout Alpha",
          avatar: "🦁",
          points: 4900,
          successfulPredictions: 38,
          confirmationsCount: 12,
          badge: "Aegis Master",
          isCurrentUser: false,
        },
        {
          username: "@Scout_Bravo",
          displayName: "Scout Bravo",
          avatar: "🦅",
          points: 3950,
          successfulPredictions: 29,
          confirmationsCount: 9,
          badge: "Eagle Eye",
          isCurrentUser: false,
        },
        {
          username: "@Scout_Delta",
          displayName: "Scout Delta",
          avatar: "🦊",
          points: 2850,
          successfulPredictions: 21,
          confirmationsCount: 6,
          badge: "Street Tracer",
          isCurrentUser: false,
        },
        {
          username: "@UrbanWatcher",
          displayName: "Urban Watcher",
          avatar: "🦡",
          points: 2100,
          successfulPredictions: 15,
          confirmationsCount: 4,
          badge: "Civic Watch",
          isCurrentUser: false,
        },
        {
          username: "@CityFixer",
          displayName: "City Fixer",
          avatar: "🐹",
          points: 1650,
          successfulPredictions: 10,
          confirmationsCount: 3,
          badge: "Local Hero",
          isCurrentUser: false,
        }
      ];

      // Add active user (dynamically calculated)
      const userPoints = balances.points || 0;
      const userScout = {
        username: profile.username || "@you",
        displayName: profile.displayName || "Civic Voter",
        avatar: profile.avatar || "🦉",
        points: userPoints,
        successfulPredictions: userWins + 2, // adding base of 2 for beautiful starting display
        confirmationsCount: userConfirmations,
        badge: userPoints >= 4000 ? "Aegis Master" : userPoints >= 3000 ? "Eagle Eye" : userPoints >= 2000 ? "Street Tracer" : userPoints >= 1000 ? "Civic Watch" : "Novice Scout",
        isCurrentUser: true
      };

      const allScouts = [...seedScouts, userScout];
      
      // Sort by points desc
      allScouts.sort((a, b) => b.points - a.points);

      // Map with rank index
      const leaderboard = allScouts.map((scout, idx) => ({
        ...scout,
        rank: idx + 1
      }));

      res.json({
        leaderboard,
        userStats: {
          points: userPoints,
          wins: userWins + 2,
          confirmations: userConfirmations,
          rank: leaderboard.findIndex(s => s.isCurrentUser) + 1,
          badge: userScout.badge
        }
      });
    } catch (err: any) {
      console.error("Error in /api/leaderboard:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update scout location
  app.post("/api/scout/location", async (req, res) => {
    try {
      const { username, displayName, lat, lng } = req.body;
      if (!username) return res.status(400).json({ error: "username is required" });

      const scoutData = {
        username,
        displayName: displayName || "Active Scout",
        lat: Number(lat),
        lng: Number(lng),
        lastActive: new Date().toISOString()
      };

      await setDoc(doc(db, "scouts_active", username), scoutData);
      res.json({ success: true, scout: scoutData });
    } catch (err: any) {
      console.error("Error in /api/scout/location:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get all active scouts
  app.get("/api/scouts", async (req, res) => {
    try {
      const colRef = collection(db, "scouts_active");
      const snapshot = await getDocs(colRef);
      const scouts = snapshot.docs.map((d: any) => d.data());
      
      // Filter out scouts inactive for more than 5 minutes (300000ms)
      const now = Date.now();
      const activeScouts = scouts.filter((s: any) => {
        if (!s || !s.lastActive) return false;
        const timeDiff = now - new Date(s.lastActive).getTime();
        return timeDiff < 300000; // 5 mins
      });

      res.json(activeScouts);
    } catch (err: any) {
      console.error("Error in /api/scouts:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Update profile
  app.post("/api/profile", async (req, res) => {
    try {
      const updates = req.body;
      const profileDoc = doc(db, "global", "profile");
      const current = (await getDoc(profileDoc)).data() || {};
      const merged = { ...current, ...updates };
      await setDoc(profileDoc, merged);
      res.json({ success: true, profile: merged });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Convert currency
  app.post("/api/convert", async (req, res) => {
    try {
      const { from, to, amount } = req.body;
      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;

      if (amount <= 0 || balances[from] < amount) {
        return res.status(400).json({ error: "Invalid amount or insufficient balance" });
      }

      const RATES: Record<string, number> = { points: 1, usdc_base: 100, usdt_sol: 100 };
      const toPoints = (amt: number, c: string) => amt * RATES[c];
      const fromPoints = (pts: number, c: string) => pts / RATES[c];

      const pts = toPoints(amount, from);
      const outAmt = +fromPoints(pts, to).toFixed(6);

      balances[from] = +(balances[from] - amount).toFixed(6);
      balances[to] = +(balances[to] + outAmt).toFixed(6);

      await setDoc(balancesDocRef, balances);

      const mockHash = (chain: string) => {
        const chars = "0123456789abcdef";
        const len = chain === "Solana" ? 44 : 66;
        let s = chain === "Solana" ? "" : "0x";
        for (let i = 0; i < len - s.length; i++) s += chars[Math.floor(Math.random() * 16)];
        return s;
      };

      const CURRENCY_META: Record<string, { chain: string }> = {
        points: { chain: "Off-chain" },
        usdc_base: { chain: "Base" },
        usdt_sol: { chain: "Solana" }
      };

      const tx1 = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "convert",
        currency: from,
        amount: -amount,
        note: `Convert ${amount} ${from === 'points' ? 'pts' : from === 'usdc_base' ? 'USDC' : 'USDT'} → ${outAmt} ${to === 'points' ? 'pts' : to === 'usdc_base' ? 'USDC' : 'USDT'}`,
        txHash: from !== "points" ? mockHash(CURRENCY_META[from].chain) : undefined
      };

      const tx2 = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "convert",
        currency: to,
        amount: outAmt,
        note: `Received from conversion`,
        txHash: to !== "points" ? mockHash(CURRENCY_META[to].chain) : undefined
      };

      await setDoc(doc(db, "txs", tx1.id), tx1);
      await setDoc(doc(db, "txs", tx2.id), tx2);

      res.json({ success: true, balances });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Claim Base USDC Faucet (Gasless sponsored background mint)
  app.post("/api/faucet", async (req, res) => {
    try {
      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;

      const topupAmount = 100.0;
      balances["usdc_base"] = +(balances["usdc_base"] + topupAmount).toFixed(6);
      await setDoc(balancesDocRef, balances);

      const mockHash = () => {
        const chars = "0123456789abcdef";
        let s = "0x";
        for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * 16)];
        return s;
      };

      const tx = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "deposit",
        currency: "usdc_base",
        amount: topupAmount,
        note: `Base Smart Account: Faucet Claim`,
        txHash: mockHash()
      };
      await setDoc(doc(db, "txs", tx.id), tx);

      res.json({ success: true, balances });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Transfer / Withdraw funds
  app.post("/api/transfer", async (req, res) => {
    try {
      const { currency, amount, toAddress } = req.body;
      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;

      if (!currency || amount <= 0 || !toAddress) {
        return res.status(400).json({ error: "Missing required parameters or invalid amount" });
      }

      if (balances[currency] < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      balances[currency] = +(balances[currency] - amount).toFixed(6);
      await setDoc(balancesDocRef, balances);

      const mockHash = (chain: string) => {
        const chars = "0123456789abcdef";
        const len = chain === "Solana" ? 44 : 66;
        let s = chain === "Solana" ? "" : "0x";
        for (let i = 0; i < len - s.length; i++) s += chars[Math.floor(Math.random() * 16)];
        return s;
      };

      const chains: Record<string, string> = {
        usdc_base: "Base",
        usdt_sol: "Solana",
        points: "Off-chain"
      };

      const tx = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "withdrawal",
        currency,
        amount: -amount,
        note: `Transfer to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
        txHash: currency !== "points" ? mockHash(chains[currency]) : undefined
      };
      await setDoc(doc(db, "txs", tx.id), tx);

      res.json({ success: true, balances });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Simulate deposit
  app.post("/api/deposit", async (req, res) => {
    try {
      const { currency, amount } = req.body;
      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;

      if (!currency || amount <= 0) {
        return res.status(400).json({ error: "Missing required parameters or invalid amount" });
      }

      balances[currency] = +(balances[currency] + amount).toFixed(6);
      await setDoc(balancesDocRef, balances);

      const mockHash = (chain: string) => {
        const chars = "0123456789abcdef";
        const len = chain === "Solana" ? 44 : 66;
        let s = chain === "Solana" ? "" : "0x";
        for (let i = 0; i < len - s.length; i++) s += chars[Math.floor(Math.random() * 16)];
        return s;
      };

      const chains: Record<string, string> = {
        usdc_base: "Base",
        usdt_sol: "Solana",
        points: "Off-chain"
      };

      const tx = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "deposit",
        currency,
        amount,
        note: `External Deposit Received`,
        txHash: currency !== "points" ? mockHash(chains[currency]) : undefined
      };
      await setDoc(doc(db, "txs", tx.id), tx);

      res.json({ success: true, balances });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Place a bet
  app.post("/api/bet", async (req, res) => {
    try {
      const { marketId, optionIndex, side, currency, stake } = req.body;
      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;

      if (stake <= 0 || balances[currency] < stake) {
        return res.status(400).json({ error: "Insufficient balance or invalid stake" });
      }

      const marketDocRef = doc(db, "markets", marketId);
      const market = (await getDoc(marketDocRef)).data() as any;
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }

      const option = market.options[optionIndex];
      const odds = side === "yes" ? option.yesOdds : option.noOdds;
      const estPayout = +(stake * odds).toFixed(4);

      const RATES: Record<string, number> = { points: 1, usdc_base: 100, usdt_sol: 100 };
      const toPoints = (amt: number, c: string) => amt * RATES[c];
      const stakePoints = toPoints(stake, currency);

      const bet = {
        id: crypto.randomUUID(),
        marketId,
        optionIndex,
        optionLabel: option.label,
        side,
        currency,
        stake,
        stakePoints,
        odds,
        estPayout,
        status: "active",
        placedAt: new Date().toISOString()
      };

      // Deduct balance
      balances[currency] = +(balances[currency] - stake).toFixed(6);
      await setDoc(balancesDocRef, balances);

      // Create bet
      await setDoc(doc(db, "bets", bet.id), bet);

      // Generate tx
      const mockHash = (chain: string) => {
        const chars = "0123456789abcdef";
        const len = chain === "Solana" ? 44 : 66;
        let s = chain === "Solana" ? "" : "0x";
        for (let i = 0; i < len - s.length; i++) s += chars[Math.floor(Math.random() * 16)];
        return s;
      };

      const CURRENCY_META: Record<string, { chain: string }> = {
        points: { chain: "Off-chain" },
        usdc_base: { chain: "Base" },
        usdt_sol: { chain: "Solana" }
      };

      const tx = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        type: "bet_placed",
        currency,
        amount: -stake,
        marketId,
        betId: bet.id,
        note: `${side.toUpperCase()} @ ${odds.toFixed(2)}× · ${option.label}`,
        txHash: currency !== "points" ? mockHash(CURRENCY_META[currency].chain) : undefined
      };
      await setDoc(doc(db, "txs", tx.id), tx);

      // Update market volume
      market.volume = (market.volume || 0) + stakePoints;
      await setDoc(marketDocRef, market);

      res.json({ success: true, bet, balances });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Submit confirmation
  app.post("/api/confirmation", async (req, res) => {
    try {
      const { marketId, restored, proofUrl, notes, scout } = req.body;

      const profileDoc = await getDoc(doc(db, "global", "profile"));
      const profile = profileDoc.data() || { username: "@you" };

      const conf = {
        id: crypto.randomUUID(),
        scout: scout || profile.username,
        restored,
        ts: new Date().toISOString(),
        proofUrl,
        notes
      };

      const stateDocRef = doc(db, "marketState", marketId);
      const curState = (await getDoc(stateDocRef)).data() || { confirmations: [], status: "open" };
      const confirmations = [conf, ...(curState.confirmations || [])];

      const restoredCount = confirmations.filter((c: any) => c.restored).length;
      let status = curState.status || "open";
      let settled = false;

      if (restoredCount >= 2 && status !== "resolved") {
         status = "resolved";
         settled = true;
      } else if (restoredCount === 1) {
         status = "pending_settlement";
      }

      // Determine outcomeOption index dynamically if settled
      let outcomeOption = 0;
      const settledAt = new Date().toISOString();

      if (settled) {
         const marketDocRef = doc(db, "markets", marketId);
         const marketDocSnap = await getDoc(marketDocRef);
         if (marketDocSnap.exists()) {
            const market = marketDocSnap.data() as any;
            
            // Update market status in "markets" collection to "resolved" too
            market.status = "resolved";
            await setDoc(marketDocRef, market);

            const loggedTime = new Date(market.loggedAt).getTime();
            const settledTime = new Date(settledAt).getTime();
            const elapsedHours = (settledTime - loggedTime) / (1000 * 60 * 60);

            const parseHoursFromLabel = (label: string): number => {
              const clean = label.toLowerCase();
              const hrMatch = clean.match(/(\d+)\s*hour/);
              if (hrMatch) return parseInt(hrMatch[1], 10);
              const dayMatch = clean.match(/(\d+)\s*day/);
              if (dayMatch) return parseInt(dayMatch[1], 10) * 24;
              const wkMatch = clean.match(/(\d+)\s*week/);
              if (wkMatch) return parseInt(wkMatch[1], 10) * 24 * 7;
              return Infinity;
            };

            for (let i = 0; i < market.options.length; i++) {
              const limit = parseHoursFromLabel(market.options[i].label);
              if (elapsedHours <= limit) {
                outcomeOption = i;
                break;
              }
              outcomeOption = i;
            }
         }
      }

      const marketStateUpdate = {
         ...curState,
         confirmations,
         status,
         ...(settled ? { settledAt, outcome: { optionIndex: outcomeOption } } : {})
      };

      await setDoc(stateDocRef, marketStateUpdate);

      // reward the scout with points
      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;
      if (!scout || scout === profile.username) {
         balances.points = (balances.points || 0) + 250;
         await setDoc(balancesDocRef, balances);

         const tx = {
           id: crypto.randomUUID(),
           ts: new Date().toISOString(),
           type: "reward",
           currency: "points",
           amount: 250,
           marketId,
           note: "Scout confirmation reward"
         };
         await setDoc(doc(db, "txs", tx.id), tx);
      }

      // If settled, resolve the active bets
      if (settled) {
         const betsSnapshot = await getDocs(collection(db, "bets"));
         const mockHash = (chain: string) => {
           const chars = "0123456789abcdef";
           const len = chain === "Solana" ? 44 : 66;
           let s = chain === "Solana" ? "" : "0x";
           for (let i = 0; i < len - s.length; i++) s += chars[Math.floor(Math.random() * 16)];
           return s;
         };

         for (const betDoc of betsSnapshot.docs) {
           const b = betDoc.data();
           if (b.marketId === marketId && b.status === "active") {
             const isWinner = b.optionIndex === outcomeOption ? b.side === "yes" : b.side === "no";
             const payout = isWinner ? +(b.stake * b.odds).toFixed(6) : 0;

             if (isWinner) {
               balances[b.currency] = +(balances[b.currency] + payout).toFixed(6);
               await setDoc(balancesDocRef, balances);

               const winTx = {
                 id: crypto.randomUUID(),
                 ts: new Date().toISOString(),
                 type: "bet_won",
                 currency: b.currency,
                 amount: payout,
                 marketId,
                 betId: b.id,
                 note: `WON ${b.side.toUpperCase()} · ${b.optionLabel}`,
                 txHash: b.currency !== "points" ? mockHash(b.currency === 'usdc_base' ? 'Base' : 'Solana') : undefined
               };
               await setDoc(doc(db, "txs", winTx.id), winTx);
             } else {
               const loseTx = {
                 id: crypto.randomUUID(),
                 ts: new Date().toISOString(),
                 type: "bet_lost",
                 currency: b.currency,
                 amount: 0,
                 marketId,
                 betId: b.id,
                 note: `LOST ${b.side.toUpperCase()} · ${b.optionLabel}`
               };
               await setDoc(doc(db, "txs", loseTx.id), loseTx);
             }

             await setDoc(doc(db, "bets", b.id), {
               ...b,
               status: isWinner ? "won" : "lost",
               payout
             });
           }
         }
      }

      res.json({ success: true, settled });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Create a market
  app.post("/api/market", async (req, res) => {
    try {
      const { ref, service, city, suburb, address, title, photoUrl, coords } = req.body;

      const profileDoc = await getDoc(doc(db, "global", "profile"));
      const profile = profileDoc.data() || { username: "@you" };

      const m = {
         id: "m_" + Math.random().toString(36).slice(2, 8),
         ref,
         service,
         city,
         suburb,
         address,
         title,
         loggedAt: new Date().toISOString(),
         status: "open",
         reporter: profile.username,
         scoutsOnSite: 0,
         historicalAvgFixHours: 6,
         volume: 0,
         coords: coords || { lat: -26.2 + Math.random() * 0.4, lng: 28 + Math.random() * 0.4 },
         options: [
           { label: "Restored within 1 hour",  yesOdds: 4.2, noOdds: 1.22, yesPool: 100, noPool: 400, yesPct: 20 },
           { label: "Restored within 4 hours", yesOdds: 2.1, noOdds: 1.75, yesPool: 200, noPool: 200, yesPct: 50 },
           { label: "Takes more than 4 hours", yesOdds: 1.45, noOdds: 2.6, yesPool: 400, noPool: 150, yesPct: 70 }
         ]
      };

      await setDoc(doc(db, "markets", m.id), m);

      const balancesDocRef = doc(db, "global", "balances");
      const balances = (await getDoc(balancesDocRef)).data() as any;
      balances.points = (balances.points || 0) + 500;
      await setDoc(balancesDocRef, balances);

      const tx = {
         id: crypto.randomUUID(),
         ts: new Date().toISOString(),
         type: "reward",
         currency: "points",
         amount: 500,
         marketId: m.id,
         note: `Opened market · ${ref}`
      };
      await setDoc(doc(db, "txs", tx.id), tx);

      res.json({ success: true, market: m });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Reset
  app.post("/api/reset", async (req, res) => {
    try {
      // Clear markets collection and write fresh seeded ones
      const marketsSnapshot = await getDocs(collection(db, "markets"));
      const writeBatchInst = writeBatch(db);
      marketsSnapshot.docs.forEach((docItem: any) => {
        writeBatchInst.delete(docItem.ref);
      });
      await writeBatchInst.commit();

      const { MARKETS } = await import("./src/lib/data.ts");
      const batch2 = writeBatch(db);
      for (const m of MARKETS) {
        batch2.set(doc(db, "markets", m.id), m);
      }
      await batch2.commit();

      const profile = {
        username: "@you",
        displayName: "Civic Voter",
        bio: "Prediction citizen. Reporting outages, betting on fixes.",
        avatar: "🦉",
        location: "Johannesburg, ZA",
      };
      await setDoc(doc(db, "global", "profile"), profile);

      const balances = {
        points: 2480,
        usdc_base: 12.5,
        usdt_sol: 8.2,
      };
      await setDoc(doc(db, "global", "balances"), balances);

      // Reset bets and txs collections by deleting all documents
      const betsSnapshot = await getDocs(collection(db, "bets"));
      const bBatch = writeBatch(db);
      betsSnapshot.docs.forEach((docItem: any) => bBatch.delete(docItem.ref));
      await bBatch.commit();

      const txsSnapshot = await getDocs(collection(db, "txs"));
      const tBatch = writeBatch(db);
      txsSnapshot.docs.forEach((docItem: any) => tBatch.delete(docItem.ref));
      await tBatch.commit();

      const msSnapshot = await getDocs(collection(db, "marketState"));
      const msBatch = writeBatch(db);
      msSnapshot.docs.forEach((docItem: any) => msBatch.delete(docItem.ref));
      await msBatch.commit();

      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite development middleware or serve production assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
