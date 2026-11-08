import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";

const inc = FieldValue.increment;
const round2 = (n) => Math.round(n * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });

const schema = z.object({
  amount: z.coerce.number({ message: "Enter a valid amount" }).min(1, "Minimum is Rs 1").max(10_000_000_000, "Amount is too large"),
});

export const moveRewards = async (req, res, next) => {
  try {
    const p = schema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    const amount = round2(p.data.amount);
    const userRef = db.collection("users").doc(req.user.uid);

    await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      if (!snap.exists) throw httpError(404, "User not found");
      const u = snap.data();
      if (u.status === "suspended") throw httpError(403, "Your account is suspended");
      if (Number(u.wallets?.rewards || 0) < amount) throw httpError(400, "Insufficient Rewards Wallet balance");

      const now = new Date();
      t.update(userRef, { "wallets.rewards": inc(-amount), "wallets.earning": inc(amount), updatedAt: now });
      t.set(db.collection("transactions").doc(), {
        uid: req.user.uid, type: "wallet_transfer", note: "Rewards to Earning wallet",
        amount, status: "completed", createdAt: now,
      });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};


