import { db } from "../config/firebase.js";
import { creditUserPlans } from "../services/reward.service.js";
import { dayKey } from "../services/referral.service.js";

const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;

export const getEarnings = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    await creditUserPlans(uid).catch((e) => console.error("reward error:", e.message)); // pay anything due first

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const [txSnap, plansSnap] = await Promise.all([
      db.collection("transactions").where("uid", "==", uid).where("type", "==", "daily_reward").limit(1000).get(),
      db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").get(),
    ]);

    const today = dayKey();
    const last7 = Array.from({ length: 7 }, (_, i) => dayKey(new Date(Date.now() - (6 - i) * 864e5)));
    const byDay = Object.fromEntries(last7.map((d) => [d, 0]));

    let total = 0, totalDays = 0, todayAmount = 0, todayDays = 0;

    const all = txSnap.docs
      .map((d) => {
        const t = d.data();
        const created = t.createdAt?.toDate?.();
        const key = created ? dayKey(created) : "";
        const amount = num(t.amount);
        const days = num(t.days) || 1;

        total += amount;
        totalDays += days;
        if (key === today) { todayAmount += amount; todayDays += days; }
        if (key in byDay) byDay[key] += amount;

        return { id: d.id, planName: t.planName || "Plan", days, amount, createdAt: created?.toISOString() || null };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    res.json({
      stats: {
        today: round2(todayAmount),
        total: round2(total),
        todayRewards: todayDays,
        totalRewards: totalDays,
      },
      daily: {
        amount: round2(plansSnap.docs.reduce((a, d) => a + num(d.data().dailyProfit), 0)),
        plans: plansSnap.size,
      },
      chart: last7.map((date) => ({ date, amount: round2(byDay[date]) })),
      items: all.slice(0, limit),
      hasMore: all.length > limit,
    });
  } catch (err) {
    next(err);
  }
};
