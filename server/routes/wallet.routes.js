import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { moveRewards } from "../controllers/wallet.controller.js";

const router = Router();
router.post("/transfer", verifyToken, rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }), moveRewards);
export default router;

