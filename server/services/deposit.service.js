import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { withTotals } from "./plans.service.js";
import { INDIRECT_RATES, REPURCHASE_DIRECT, WELCOME_BONUS, rateForCount, MAX_LEVELS } from "../config/referral.config.js";
import { dayKey } from "./referral.service.js";

const inc = FieldValue.increment;
const round2 = (n) => Math.round(n * 100) / 100;

// Uses the terms saved when the customer paid, not today's edited plan
async function planForDeposit(t, dep) {
  if (dep.planSnapshot) {
    return { id: dep.planId, name: dep.planName, price: dep.amount, ...dep.planSnapshot };
  }
  const s = await t.get(db.collection("plans").doc(dep.planId));
  return s.exists ? { ...withTotals(s.id, s.data()), price: dep.amount } : null;
}

/**
 * Approves a pending payment in ONE transaction:
 * activates the plan, pays the day-1 reward, the welcome bonus,
 * and the referral bonuses up the chain.
 */
export async function approveDeposit(depositId) {
  const users = db.collection("users");
  const depRef = db.collection("deposits").doc(depositId);

  return db.runTransaction(async (t) => {
    // ---------- reads first ----------
    const depSnap = await t.get(depRef);
    if (!depSnap.exists) throw new Error("Payment not found");
    const dep = depSnap.data();
    if (dep.status !== "pending") throw new Error(`Already ${dep.status}`);

    const plan = await planForDeposit(t, dep);
    if (!plan) throw new Error("Plan no longer exists");

    const buyerRef = users.doc(dep.uid);
    const buyerSnap = await t.get(buyerRef);
    if (!buyerSnap.exists) throw new Error("User not found");
    const buyer = buyerSnap.data();

    const firstPurchase = !buyer.referralBonusPaid;

    // direct referrer + as many levels as we pay for
    // const uplineIds = (buyer.uplines || []).slice(0, 1 + INDIRECT_RATES.length);
    const uplineIds = (buyer.uplines || []).slice(0, MAX_LEVELS);
    const upRefs = uplineIds.map((id) => users.doc(id));
    const upSnaps = upRefs.length ? await t.getAll(...upRefs) : [];

    // how many active referrals the direct referrer already has
    let activeCount = 0;
    if (firstPurchase && uplineIds.length) {
      const q = await t.get(
        users.where("referredBy", "==", uplineIds[0]).where("hasPlan", "==", true).select()
      );
      activeCount = q.docs.filter((d) => d.id !== dep.uid).length;
    }

    // ---------- writes ----------
    const now = new Date();
    const today = dayKey(now);
    const sameDay = buyer.stats?.todayDate === today;
    const first = plan.dailyProfit;                                   // day-1 reward
    const welcome = firstPurchase && buyer.referredBy ? WELCOME_BONUS : 0;
    const credit = first + welcome;
    const oneDay = plan.durationDays <= 1;

    t.set(db.collection("userPlans").doc(), {
      uid: dep.uid, planId: plan.id, name: plan.name, amount: plan.price,
      dailyProfit: plan.dailyProfit, totalProfit: plan.totalProfit, durationDays: plan.durationDays,
      daysPaid: 1, earned: first, upfront: true,
      status: oneDay ? "completed" : "active",
      depositId, startedAt: now,
      endsAt: new Date(now.getTime() + (plan.durationDays - 1) * 864e5),
      lastCreditedAt: now,
    });

    t.set(db.collection("transactions").doc(), {
      uid: dep.uid, type: "daily_reward", planName: plan.name,
      days: 1, amount: first, status: "completed", createdAt: now,
    });

    if (welcome > 0) {
      t.set(db.collection("transactions").doc(), {
        uid: dep.uid, type: "welcome_bonus", amount: welcome, status: "completed", createdAt: now,
      });
    }

    t.update(buyerRef, {
      hasDeposit: true,
      hasPlan: true,
      referralBonusPaid: true,
      "stats.ownInvestment": inc(plan.price),
      "wallets.earning": inc(credit),
      "stats.totalEarnings": inc(credit),
      "stats.todayEarnings": sameDay ? inc(credit) : credit,
      "stats.todayDate": today,
      updatedAt: now,
    });
    t.update(depRef, { status: "approved", updatedAt: now });

    const bonuses = [];
    upSnaps.forEach((snap, i) => {
      if (!snap.exists) return;
      const upRef = upRefs[i];

      // team investment tiles on the Referrals page
      t.set(
        db.collection("referralDaily").doc(`${upRef.id}_${today}`),
        { uid: upRef.id, date: today, invest: inc(plan.price) },
        { merge: true }
      );

      const percent =
        i === 0
          ? firstPurchase ? rateForCount(activeCount) : REPURCHASE_DIRECT
          : firstPurchase ? INDIRECT_RATES[i - 1] || 0 : 0;
      const bonus = round2((plan.price * percent) / 100);

      const patch = { "stats.teamInvestment": inc(plan.price), updatedAt: now };
      if (bonus > 0) {
        patch["wallets.referral"] = inc(bonus);
        patch["stats.totalEarnings"] = inc(bonus);
        patch[i === 0 ? "referralStats.directCommission" : "referralStats.indirectCommission"] = inc(bonus);

        t.set(db.collection("transactions").doc(), {
          uid: upRef.id, type: "referral_bonus",
          level: i + 1, percent, repeat: !firstPurchase,
          amount: bonus, fromUid: dep.uid, status: "completed", createdAt: now,
        });
        bonuses.push({ uid: upRef.id, level: i + 1, percent, bonus });
      }
      t.update(upRef, patch);
    });

    return { planName: plan.name, bonuses, welcome };
  });
}


