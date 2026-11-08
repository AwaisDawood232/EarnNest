import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "../config/env.js";
import authRoutes from "../routes/auth.routes.js";
import dashboardRoutes from "../routes/dashboard.routes.js";
import { notFound, errorHandler } from "../middleware/error.middleware.js";
import referralRoutes from "../routes/referral.routes.js";
import plansRoutes from "../routes/plans.routes.js";
import depositRoutes from "../routes/deposit.routes.js";
import path from "path";
import profileRoutes from "../routes/profile.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import transactionsRoutes from "../routes/transactions.routes.js";
import withdrawalRoutes from "../routes/withdrawal.routes.js";
import earningsRoutes from "../routes/earnings.routes.js";
import achievementsRoutes from "../routes/achievements.routes.js";
import walletRoutes from "../routes/wallet.routes.js";
import promoRoutes from "../routes/promo.routes.js";
import adsRoutes from "../routes/ads.routes.js";
import { fileURLToPath } from "url";



const app = express();

// 1. Security and CORS middleware — before routes
app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Public avatars only. Receipts stay private.
// helmet blocks cross-origin images by default, so this route allows them.
app.use(
  "/uploads/avatars",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve("uploads/avatars"), { maxAge: "7d", index: false })
);


app.use(
  "/uploads/ads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve("uploads/ads"), { maxAge: "7d", index: false })
);

app.use(
  "/uploads/methods",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve("uploads/methods"), { maxAge: "7d", index: false })
);


// 2. General middleware
app.use(express.json());
app.set("trust proxy", 1);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
app.use(morgan("dev"));

// 3. Rate limiting
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

// 4. Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// 5. API routes — register each route once
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/referrals", referralRoutes); 
app.use("/api/plans", plansRoutes);        
app.use("/api/deposits", depositRoutes);  
app.use("/api/profile", profileRoutes);     
app.use("/api/admin", adminRoutes); 
app.use("/api/admin", adminRoutes);
app.use("/api/transactions", transactionsRoutes);  
app.use("/api/transactions", transactionsRoutes);
app.use("/api/withdrawals", withdrawalRoutes); 
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/achievements", achievementsRoutes);   
app.use("/api/wallet", walletRoutes); 
app.use("/api/wallet", walletRoutes);
app.use("/api/promos", promoRoutes);
app.use("/api/ads", adsRoutes);

// 6. Error handling — after routes
app.use(notFound);
app.use(errorHandler);

export default app;
