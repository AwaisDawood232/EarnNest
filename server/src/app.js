

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "../config/env.js";

import authRoutes from "../routes/auth.routes.js";
import dashboardRoutes from "../routes/dashboard.routes.js";
import referralRoutes from "../routes/referral.routes.js";
import plansRoutes from "../routes/plans.routes.js";
import depositRoutes from "../routes/deposit.routes.js";
import profileRoutes from "../routes/profile.routes.js";
import adminRoutes from "../routes/admin.routes.js";
import transactionsRoutes from "../routes/transactions.routes.js";
import withdrawalRoutes from "../routes/withdrawal.routes.js";
import earningsRoutes from "../routes/earnings.routes.js";
import achievementsRoutes from "../routes/achievements.routes.js";
import walletRoutes from "../routes/wallet.routes.js";
import promoRoutes from "../routes/promo.routes.js";
import adsRoutes from "../routes/ads.routes.js";

import {
  notFound,
  errorHandler,
} from "../middleware/error.middleware.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, "../public");
const uploadsDir = path.resolve(__dirname, "../uploads");

// Trust Hostinger's reverse proxy
app.set("trust proxy", 1);

// --------------------------------------------------
// 1. Security and CORS
// --------------------------------------------------

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: {
      policy: "same-origin-allow-popups",
    },
  })
);

app.use(
  cors({
    origin:
      env.clientUrl ||
      "http://localhost:5173",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// --------------------------------------------------
// 2. Public uploads
// --------------------------------------------------

// Public avatars
app.use(
  "/uploads/avatars",
  (req, res, next) => {
    res.setHeader(
      "Cross-Origin-Resource-Policy",
      "cross-origin"
    );
    next();
  },
  express.static(
    path.join(uploadsDir, "avatars"),
    {
      maxAge: "7d",
      index: false,
    }
  )
);

// Public advertisements
app.use(
  "/uploads/ads",
  (req, res, next) => {
    res.setHeader(
      "Cross-Origin-Resource-Policy",
      "cross-origin"
    );
    next();
  },
  express.static(
    path.join(uploadsDir, "ads"),
    {
      maxAge: "7d",
      index: false,
    }
  )
);

// Public payment method images
app.use(
  "/uploads/methods",
  (req, res, next) => {
    res.setHeader(
      "Cross-Origin-Resource-Policy",
      "cross-origin"
    );
    next();
  },
  express.static(
    path.join(uploadsDir, "methods"),
    {
      maxAge: "7d",
      index: false,
    }
  )
);

// --------------------------------------------------
// 3. General middleware
// --------------------------------------------------

app.use(express.json());
app.use(morgan("dev"));

// --------------------------------------------------
// 4. Rate limiting
// --------------------------------------------------

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

// --------------------------------------------------
// 5. Health check
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// --------------------------------------------------
// 6. API routes
// --------------------------------------------------

app.use("/api/auth", authRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/referrals", referralRoutes);

app.use("/api/plans", plansRoutes);

app.use("/api/deposits", depositRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/transactions", transactionsRoutes);

app.use("/api/withdrawals", withdrawalRoutes);

app.use("/api/earnings", earningsRoutes);

app.use("/api/achievements", achievementsRoutes);

app.use("/api/wallet", walletRoutes);

app.use("/api/promos", promoRoutes);

app.use("/api/ads", adsRoutes);

// --------------------------------------------------
// 7. Serve React production build
// --------------------------------------------------

app.use(
  express.static(publicDir, {
    index: false,
    maxAge: "7d",
  })
);

// React Router fallback
app.use((req, res, next) => {
  if (
    req.method !== "GET" ||
    req.path.startsWith("/api") ||
    req.path.startsWith("/uploads")
  ) {
    return next();
  }

  res.sendFile(
    path.join(publicDir, "index.html")
  );
});

// --------------------------------------------------
// 8. Error handling
// --------------------------------------------------

app.use(notFound);

app.use(errorHandler);

export default app;

