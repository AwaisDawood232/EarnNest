import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { receiptUpload } from "../middleware/upload.middleware.js";
import { createDeposit, listMyDeposits } from "../controllers/deposit.controller.js";

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

router.get("/", verifyToken, listMyDeposits);
router.post("/", verifyToken, limiter, receiptUpload, createDeposit);
export default router;

