import { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyToken } from "../middleware/auth.middleware.js";
import { avatarUpload } from "../middleware/avatar.middleware.js";
import { getProfile, updateProfile, uploadAvatar, removeAvatar } from "../controllers/profile.controller.js";

const router = Router();
const photoLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });
const editLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

router.get("/", verifyToken, getProfile);
router.patch("/", verifyToken, editLimiter, updateProfile);
router.post("/avatar", verifyToken, photoLimiter, avatarUpload, uploadAvatar);
router.delete("/avatar", verifyToken, photoLimiter, removeAvatar);

export default router;

