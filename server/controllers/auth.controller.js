import { db } from "../config/firebase.js";
import { createUniqueReferralCode } from "../utils/referral.js";
import { MAX_LEVELS } from "../config/referral.config.js";

const users = db.collection("users");

export const syncUser = async (req, res, next) => {
  try {
    const { uid, email, picture, email_verified, firebase } = req.user;
    const { fullName, phone, country, referralCode } = req.body;
    const ref = users.doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      // Resolve the referrer (if a valid code was given)
      let referredBy = null;
      let uplines = [];
      const code = referralCode?.trim().toUpperCase();
      if (code) {
        const q = await users.where("referralCode", "==", code).limit(1).get();
        if (!q.empty && q.docs[0].id !== uid) {
          const parent = q.docs[0];
          referredBy = parent.id;
          uplines = [parent.id, ...(parent.data().uplines || [])].slice(0, MAX_LEVELS);
        }
      }

      await ref.set({
        uid,
        email,
        fullName: fullName || req.user.name || "",
        phone: phone || "",
        country: country || "",
        photoURL: picture || "",
        provider: firebase.sign_in_provider,
        emailVerified: !!email_verified,
        role: "user",
        status: "active",
        referralCode: await createUniqueReferralCode(),
        referredBy,
        uplines,                       // [parent, grandparent, ...] up to 10
        hasDeposit: false,
        hasPlan: false,
        wallets: { deposit: 0, earning: 0, referral: 0, rewards: 0 },
        stats: { todayEarnings: 0, adsWatchedToday: 0, totalEarnings: 0, ownInvestment: 0, teamInvestment: 0 },
        referralStats: { directCommission: 0, indirectCommission: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      const patch = { emailVerified: !!email_verified, updatedAt: new Date() };
      if (!snap.data().referralCode) patch.referralCode = await createUniqueReferralCode();
      await ref.update(patch);
    }

    const user = (await ref.get()).data();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const snap = await users.doc(req.user.uid).get();
    if (!snap.exists) return res.status(404).json({ message: "User not found" });
    res.json({ user: snap.data() });
  } catch (err) {
    next(err);
  }
};