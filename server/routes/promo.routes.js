import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getOverview, claim } from "../controllers/promo.controller.js";

const router = Router();
// stops people from guessing codes
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

router.get("/", verifyToken, getOverview);
router.post("/claim", verifyToken, limiter, claim);

export default router;

