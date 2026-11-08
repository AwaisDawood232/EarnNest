import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { syncSchema } from "../validators/auth.validator.js";
import { syncUser, getMe } from "../controllers/auth.controller.js";

const router = Router();

router.post("/sync", verifyToken, validate(syncSchema), syncUser);
router.get("/me", verifyToken, getMe);

export default router;