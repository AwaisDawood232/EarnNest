import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getOverview, claimAchievement, claimEvent, checkin } from "../controllers/achievements.controller.js";

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

router.get("/", verifyToken, getOverview);
router.post("/checkin", verifyToken, limiter, checkin);
router.post("/events/:id/claim", verifyToken, limiter, claimEvent);
router.post("/:id/claim", verifyToken, limiter, claimAchievement);

export default router;

