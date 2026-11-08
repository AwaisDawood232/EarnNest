import { db } from "../config/firebase.js";
import { DIRECT_TIERS, REPURCHASE_DIRECT, INDIRECT_RATES, WELCOME_BONUS, rateForCount } from "../config/referral.config.js";
import { createUniqueReferralCode } from "../utils/referral.js";
import { dayKey } from "../services/referral.service.js";

const users = db.collection("users");
const num = (v) => Number(v || 0);

const maskEmail = (e = "") => {
  const [name = "", domain = ""] = e.split("@");
  if (!domain) return "";
  return name.length <= 2 ? `${name[0] || ""}***@${domain}` : `${name[0]}${"*".repeat(Math.max(name.length - 2, 3))}${name.slice(-1)}@${domain}`;
};
const maskPhone = (p = "") => (p.length > 6 ? `${p.slice(0, 4)}****${p.slice(-3)}` : "");

// PUBLIC: used by the register page to check a code while typing
export const validateCode = async (req, res, next) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) return res.json({ valid: false });
    const q = await users.where("referralCode", "==", code).limit(1).get();
    if (q.empty) return res.json({ valid: false });
    const name = q.docs[0].data().fullName || "a member";
    res.json({ valid: true, referrerName: name.split(" ")[0] });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const meRef = users.doc(uid);
    const meSnap = await meRef.get();
    if (!meSnap.exists) return res.status(404).json({ message: "User not found" });
    const me = meSnap.data();

    let referralCode = me.referralCode;
    if (!referralCode) {
      referralCode = await createUniqueReferralCode();
      await meRef.update({ referralCode });
    }

    // counts
    const [directSnap, teamSnap] = await Promise.all([
      users.where("referredBy", "==", uid).select("hasPlan").get(),
      users.where("uplines", "array-contains", uid).select("referredBy").get(),
    ]);
    const direct = directSnap.size;
    const indirect = Math.max(teamSnap.size - direct, 0);
    const inactive = directSnap.docs.filter((d) => !d.data().hasPlan).length;
    const active = directSnap.docs.filter((d) => d.data().hasPlan).length;
    const nextTier = DIRECT_TIERS.find((t) => t.min > active) || null;

    // team invest/ads for the last 31 days (one doc per day)
    const days = Array.from({ length: 31 }, (_, i) => dayKey(new Date(Date.now() - i * 864e5)));
    const daySnaps = await db.getAll(...days.map((d) => db.collection("referralDaily").doc(`${uid}_${d}`)));
    const byDay = {};
    daySnaps.forEach((s, i) => { if (s.exists) byDay[days[i]] = s.data(); });
    const sum = (field, pred) =>
      days.filter(pred).reduce((a, d) => a + num(byDay[d]?.[field]), 0);
    const month = days[0].slice(0, 7);
    const periods = (field) => ({
      today: num(byDay[days[0]]?.[field]),
      yesterday: num(byDay[days[1]]?.[field]),
      month: sum(field, (d) => d.startsWith(month)),
    });

    // who referred me
    let referredBy = null;
    if (me.referredBy) {
      const p = await users.doc(me.referredBy).get();
      if (p.exists) {
        const pd = p.data();
        referredBy = { name: pd.fullName || "Member", email: maskEmail(pd.email), phone: maskPhone(pd.phone) };
      }
    }

    const rs = me.referralStats || {};
    res.json({
      referralCode,
      referredBy,
      counts: { direct, indirect, inactive },
      commission: {
        direct: num(rs.directCommission),
        indirect: num(rs.indirectCommission),
        total: num(rs.directCommission) + num(rs.indirectCommission),
      },
      invest: periods("invest"),
      ads: periods("ads"),
      referralWallet: num(me.wallets?.referral),
      active,
      rate: rateForCount(active),
      next: nextTier,
      rules: { tiers: DIRECT_TIERS, repurchase: REPURCHASE_DIRECT, indirect: INDIRECT_RATES, welcome: WELCOME_BONUS },
    });
  } catch (err) {
    next(err);
  }
};

export const listReferrals = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const type = req.query.type === "indirect" ? "indirect" : "direct";
    const filter = String(req.query.filter || "all");

    const q =
      type === "direct"
        ? users.where("referredBy", "==", uid)
        : users.where("uplines", "array-contains", uid);
    const snap = await q.limit(500).get();

    const tests = {
      all: () => true,
      deposit: (r) => r.hasDeposit,
      "no-deposit": (r) => !r.hasDeposit,
      plans: (r) => r.hasPlan,
      "no-plans": (r) => !r.hasPlan,
    };

    const referrals = snap.docs
      .filter((d) => type === "direct" || d.data().referredBy !== uid)
      .map((d) => {
        const u = d.data();
        return {
          id: d.id,
          name: u.fullName || "Member",
          email: maskEmail(u.email),
          level: (u.uplines || []).indexOf(uid) + 1,
          hasDeposit: !!u.hasDeposit,
          hasPlan: !!u.hasPlan,
          joinedAt: u.createdAt?.toDate?.().toISOString() || null,
        };
      })
      .filter(tests[filter] || tests.all)
      .sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));

    res.json({ referrals });
  } catch (err) {
    next(err);
  }
};