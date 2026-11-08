import { db } from "../config/firebase.js";
import { avatarUrlOf } from "../utils/avatar.js";
import { creditUserPlans } from "../services/reward.service.js";
import { dayKey } from "../services/referral.service.js";
import { getNextAchievement, latestPost } from "../services/achievements.service.js";
import { getCommunity } from "../services/community.service.js";

const num = (v) => Number(v || 0);

export const getDashboard = async (req, res, next) => {
  try {
    await creditUserPlans(req.user.uid).catch((e) => console.error("reward error:", e.message));

    const uid = req.user.uid;
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return res.status(404).json({ message: "User not found" });

    const u = snap.data();
    const w = u.wallets || {};
    const s = u.stats || {};

    const wallets = {
      deposit: num(w.deposit),
      earning: num(w.earning),
      referral: num(w.referral),
      rewards: num(w.rewards),
    };

    const [refCount, plansSnap] = await Promise.all([
      db.collection("users").where("referredBy", "==", uid).count().get(),
      db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").limit(5).get(),
    ]);

    res.json({
      
      // user: { fullName: u.fullName, email: u.email, referralCode: u.referralCode, avatarUrl: avatarUrlOf(u) },
      user: { fullName: u.fullName, email: u.email, referralCode: u.referralCode, avatarUrl: avatarUrlOf(u), role: u.role || "user" },
      totalBalance: Object.values(wallets).reduce((a, b) => a + b, 0),
      wallets,
      stats: {
        todayEarnings: s.todayDate === dayKey() ? num(s.todayEarnings) : 0,
        adsWatchedToday: num(s.adsWatchedToday),
        directReferrals: refCount.data().count,
        totalEarnings: num(s.totalEarnings),
      },
      activePlans: plansSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
        amount: num(d.data().amount),
      })),
      // dummy targets for now; replace with real achievement rules later
      // nextAchievement: {
      //   title: "Member",
      //   reward: 250,
      //   own: { current: num(s.ownInvestment), target: 5000 },
      //   team: { current: num(s.teamInvestment), target: 25000 },
      //   nextAchievement: await getNextAchievement(u),
      // },
      nextAchievement: await getNextAchievement(u),
      announcement: await latestPost(),
      community: await getCommunity(),
      
    });
  } catch (err) {
    next(err);
  }
};

