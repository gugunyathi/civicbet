import express from "express";
import path from "path";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import apiRouter from "./src/routes.js";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/civicbet";
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB at", MONGO_URI);
  } catch (err: any) {
    console.error("✗ Failed to connect to MongoDB:", err.message);
    console.error("  → Hint: Set MONGO_URI in your .env file (e.g. a MongoDB Atlas connection string).");
    // Continue server even if DB is unavailable (guest placeholders will still work)
  }

  const app = express();
  app.use(express.json());

  // Mount API router
  app.use("/api", apiRouter);

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
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

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });
}

startServer();
