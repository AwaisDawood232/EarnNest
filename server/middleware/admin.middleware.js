import { verifyToken } from "./auth.middleware.js";
import { db } from "../config/firebase.js";

// Valid login AND role === "admin" (checked in Firestore on every request)
export const requireAdmin = [
  verifyToken,
  async (req, res, next) => {
    try {
      const snap = await db.collection("users").doc(req.user.uid).get();
      if (!snap.exists || snap.data().role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (err) {
      next(err);
    }
  },
];

