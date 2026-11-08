import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validateCode, getSummary, listReferrals } from "../controllers/referral.controller.js";

const router = Router();

// public endpoint, so limit it harder to stop code-guessing
const validateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

router.get("/validate/:code", validateLimiter, validateCode);
router.get("/summary", verifyToken, getSummary);
router.get("/", verifyToken, listReferrals);

export default router;

