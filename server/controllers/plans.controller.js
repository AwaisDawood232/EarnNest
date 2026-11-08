// import { PLANS } from "../config/plans.config.js";
import { listActivePlans } from "../services/plans.service.js";
import { getMethods } from "../services/payment.service.js";
import { db } from "../config/firebase.js";
import { creditUserPlans } from "../services/reward.service.js";


// export const listPlans = async (req, res, next) => {
//   try {
//     const plans = await listActivePlans();
//     res.json({ plans });
//   } catch (err) {
//     next(err);
//   }
// };
export const listPlans = async (req, res, next) => {
  try {
    res.json({ plans: await listActivePlans() });
  } catch (err) {
    next(err);
  }
};
export const listMethods = async (req, res, next) => {
  try {
    res.json({ methods: await getMethods() });
  } catch (err) {
    next(err);
  }
};

export const listMyPlans = async (req, res, next) => {
  try {
    await creditUserPlans(req.user.uid).catch(console.error); // pay anything due first

    const snap = await db.collection("userPlans").where("uid", "==", req.user.uid).limit(100).get();
    const iso = (ts) => ts?.toDate?.().toISOString() || null;

    const plans = snap.docs
      .map((d) => {
  const p = d.data();
  const daysPaid = p.daysPaid || 0;
  const off = p.upfront ? 1 : 0;
  const DAY = 864e5;
  const start = p.startedAt.toDate().getTime();
  const nextDue = start + (daysPaid + 1 - off) * DAY;   // when the next reward is credited
  const periodStart = nextDue - DAY;                     // when it started accruing
  const active = p.status === "active";
  return {
    id: d.id,
    name: p.name,
    amount: p.amount,
    dailyProfit: p.dailyProfit,
    totalProfit: p.totalProfit,
    durationDays: p.durationDays,
    daysPaid,
    daysLeft: Math.max(p.durationDays - daysPaid, 0),
    earned: p.earned || 0,
    status: p.status,
    startedAt: iso(p.startedAt),
    endsAt: iso(p.endsAt),
    nextRewardAt: active ? new Date(nextDue).toISOString() : null,
    periodStart: active ? new Date(periodStart).toISOString() : null,
  };
})
      .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));

    
    res.json({ plans, serverNow: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};