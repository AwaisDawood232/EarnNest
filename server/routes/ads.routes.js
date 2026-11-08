import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getOverview, start, complete } from "../controllers/ads.controller.js";

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 80 });

router.get("/", verifyToken, getOverview);
router.post("/views/:viewId/complete", verifyToken, limiter, complete);
router.post("/:id/start", verifyToken, limiter, start);

export default router;

