import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {listPlans, listMethods, listMyPlans } from "../controllers/plans.controller.js";

const router = Router();
router.get("/", verifyToken, listPlans);
router.get("/methods", verifyToken, listMethods);
router.get("/mine", verifyToken, listMyPlans);

export default router;
