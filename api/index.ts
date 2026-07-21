import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import apiRouter from "../src/routes.js";

dotenv.config();

const app = express();
app.use(express.json());

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not set. Please configure it in Vercel project settings.");
  }
  await mongoose.connect(MONGO_URI);
  isConnected = true;
}

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err: any) {
    console.error("DB connection error:", err.message);
    res.status(503).json({ error: "Database unavailable: " + err.message });
  }
});

app.use("/api", apiRouter);

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
