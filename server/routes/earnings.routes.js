import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getEarnings } from "../controllers/earnings.controller.js";

const router = Router();
router.get("/", verifyToken, getEarnings);
export default router;

