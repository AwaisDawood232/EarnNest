import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const router = Router();
router.get("/", verifyToken, getDashboard);
export default router;

