import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { listTransactions } from "../controllers/transactions.controller.js";

const router = Router();
router.get("/", verifyToken, listTransactions);
export default router;
