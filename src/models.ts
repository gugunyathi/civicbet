import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  bio: { type: String },
  avatar: { type: String },
  location: { type: String },
  walletAddress: { type: String }
});
export const Profile = mongoose.model("Profile", ProfileSchema);

const BalanceSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Ties balance to user
  points: { type: Number, default: 2480 },
  usdc_base: { type: Number, default: 12.5 },
  usdt_sol: { type: Number, default: 8.2 }
});
export const Balance = mongoose.model("Balance", BalanceSchema);

const MarketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  ref: String,
  service: String,
  city: String,
  suburb: String,
  address: String,
  title: String,
  loggedAt: Date,
  status: { type: String, default: "open" },
  reporter: String,
  scoutsOnSite: { type: Number, default: 0 },
  historicalAvgFixHours: Number,
  volume: { type: Number, default: 0 },
  coords: {
    lat: Number,
    lng: Number
  },
  options: [{
    label: String,
    yesOdds: Number,
    noOdds: Number,
    yesPool: Number,
    noPool: Number,
    yesPct: Number
  }]
});
export const Market = mongoose.model("Market", MarketSchema);

const MarketStateSchema = new mongoose.Schema({
  marketId: { type: String, required: true, unique: true },
  status: { type: String, default: "open" },
  confirmations: [{
    id: String,
    scout: String,
    restored: Boolean,
    ts: Date,
    proofUrl: String,
    notes: String
  }],
  settledAt: Date,
  outcome: {
    optionIndex: Number
  }
});
export const MarketState = mongoose.model("MarketState", MarketStateSchema);

const BetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true }, // Added to associate bet with a user
  marketId: String,
  optionIndex: Number,
  optionLabel: String,
  side: String,
  currency: String,
  stake: Number,
  stakePoints: Number,
  odds: Number,
  estPayout: Number,
  status: String,
  placedAt: Date,
  payout: Number
});
export const Bet = mongoose.model("Bet", BetSchema);

const TransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true }, // Added for user association
  ts: Date,
  type: { type: String }, // deposit, withdrawal, convert, bet_placed, bet_won, bet_lost, reward
  currency: String,
  amount: Number,
  marketId: String,
  betId: String,
  note: String,
  txHash: String
});
export const Transaction = mongoose.model("Transaction", TransactionSchema);

const ActiveScoutSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: String,
  lat: Number,
  lng: Number,
  lastActive: Date
});
export const ActiveScout = mongoose.model("ActiveScout", ActiveScoutSchema);
