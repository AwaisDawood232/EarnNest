import { auth } from "../config/firebase.js";


export const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    // req.user = await auth.verifyIdToken(token);
    req.user = await auth.verifyIdToken(token, true);   // true = reject revoked or disabled accounts
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};