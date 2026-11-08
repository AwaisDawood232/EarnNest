import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getOverview, createWithdrawal } from "../controllers/withdrawal.controller.js";

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

router.get("/", verifyToken, getOverview);
router.post("/", verifyToken, limiter, createWithdrawal);
export default router;

