import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { dayKey } from "./referral.service.js";

const DAY = 864e5;
const inc = FieldValue.increment;

// Pays every reward that is due for ONE plan. Safe to call repeatedly.
export async function creditPlan(planDocId) {
  const ref = db.collection("userPlans").doc(planDocId);

  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return 0;
    const p = snap.data();
    if (p.status !== "active") return 0;

    const off = p.upfront ? 1 : 0; // new plans were paid day 1 at purchase
    const elapsedDays = Math.floor((Date.now() - p.startedAt.toDate().getTime()) / DAY);
    const dueDays = Math.min(elapsedDays + off, p.durationDays);
    const owed = dueDays - (p.daysPaid || 0);
    if (owed <= 0) return 0;

    const userRef = db.collection("users").doc(p.uid);
    const userSnap = await t.get(userRef);
    if (!userSnap.exists) return 0;
    if (userSnap.data().status === "suspended") return 0; // no rewards while suspended

    const amount = owed * p.dailyProfit;
    const today = dayKey();
    const sameDay = userSnap.data().stats?.todayDate === today;
    const now = new Date();

    t.update(userRef, {
      "wallets.earning": inc(amount),
      "stats.totalEarnings": inc(amount),
      "stats.todayEarnings": sameDay ? inc(amount) : amount,
      "stats.todayDate": today,
      updatedAt: now,
    });

    t.update(ref, {
      daysPaid: dueDays,
      earned: inc(amount),
      lastCreditedAt: now,
      ...(dueDays >= p.durationDays ? { status: "completed", completedAt: now } : {}),
    });

    t.set(db.collection("transactions").doc(), {
      uid: p.uid,
      type: "daily_reward",
      planName: p.name,
      days: owed,
      amount,
      status: "completed",
      createdAt: now,
    });
    return amount;
  });
}

export async function creditUserPlans(uid) {
  const snap = await db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").get();
  let total = 0;
  for (const d of snap.docs) total += await creditPlan(d.id);
  return total;
}

// Sweeps every active plan (runs every 5 minutes from server.js)
export async function creditAllDue() {
  const snap = await db.collection("userPlans").where("status", "==", "active").get();
  for (const d of snap.docs) {
    const p = d.data();
    const elapsed = Math.floor((Date.now() - p.startedAt.toDate().getTime()) / DAY);
    if (elapsed + (p.upfront ? 1 : 0) > (p.daysPaid || 0)) {
      await creditPlan(d.id).catch((e) => console.error("reward error", d.id, e.message));
    }
  }
}