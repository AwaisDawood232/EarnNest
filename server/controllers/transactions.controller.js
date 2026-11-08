import { db } from "../config/firebase.js";
import { maskAccount } from "../utils/mask.js";

const CATEGORIES = ["all", "deposit", "earning", "referral", "rewards", "withdrawal"];
const CATEGORY_OF = {
  daily_reward: "earning",
  referral_bonus: "referral",
  referral_commission: "referral",
  achievement_reward: "rewards",
  welcome_bonus: "rewards",
  checkin_reward: "rewards",
event_reward: "rewards",
promo_bonus: "rewards",
ad_reward: "earning",
};
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const round2 = (n) => Math.round(n * 100) / 100;
const sum = (arr, pred = () => true) => round2(arr.reduce((a, i) => (pred(i) ? a + i.amount : a), 0));

export const listTransactions = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const category = CATEGORIES.includes(req.query.category) ? req.query.category : "all";
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const [txSnap, depSnap, wdSnap] = await Promise.all([
      db.collection("transactions").where("uid", "==", uid).limit(1000).get(),
      db.collection("deposits").where("uid", "==", uid).limit(300).get(),
      db.collection("withdrawals").where("uid", "==", uid).limit(300).get(),
    ]);

    const all = [];

    txSnap.docs.forEach((d) => {
      const t = d.data();
      const cat = CATEGORY_OF[t.type];
      if (!cat) return;

      
      let title = t.title || "Transaction", note = t.note || "";
      if (t.type === "daily_reward") {
        title = `Daily reward · ${t.planName || "Plan"}`;
        note = `${t.days || 1} day${t.days > 1 ? "s" : ""} of earnings`;
      } else if (t.type === "referral_bonus") {
        title = t.level === 1 ? "Referral bonus · Direct" : `Referral bonus · Level ${t.level}`;
      } else if (t.type === "referral_commission") {
        title = "Referral commission";
        note = `Level ${t.level || 1}`;
      } else if (t.type === "welcome_bonus") {
        title = "Welcome bonus";
        note = "For joining through a referral link";
      } else if (t.type === "achievement_reward") {
        title = "Achievement reward";
        note = t.note || "";
      }

      all.push({
        id: d.id, category: cat, title, note,
        amount: Number(t.amount || 0), direction: "in",
        status: t.status || "completed", createdAt: iso(t.createdAt),
        _from: t.type === "referral_bonus" ? t.fromUid : null,
        _repeat: t.repeat,
        _percent: t.percent,
      });
    });

    depSnap.docs.forEach((d) => {
      const x = d.data();
      all.push({
        id: d.id, category: "deposit",
        title: `${x.planName || "Plan"} purchase`,
        note: `${x.methodName || "Payment"} · ${x.transactionId || ""}`,
        amount: Number(x.amount || 0), direction: "none",
        status: x.status || "pending", createdAt: iso(x.createdAt),
      });
    });

    wdSnap.docs.forEach((d) => {
      const x = d.data();
      all.push({
        id: d.id, category: "withdrawal",
        title: `Withdrawal · ${x.methodName}`,
        note: `To ${maskAccount(x.accountNumber)}`,
        amount: Number(x.amount || 0), direction: "out",
        status: x.status || "pending", createdAt: iso(x.createdAt),
      });
    });

    all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    // a count for every tab
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    counts.all = all.length;
    all.forEach((i) => counts[i.category]++);

    const inCat = category === "all" ? all : all.filter((i) => i.category === category);

    // a summary for the selected tab
    let summary = null;
    if (category === "deposit" || category === "withdrawal") {
      summary = {
        total: sum(inCat, (i) => i.status === "approved"),
        pending: inCat.filter((i) => i.status === "pending").length,
      };
    } else if (["earning", "referral", "rewards"].includes(category)) {
      summary = { total: sum(inCat), pending: 0 };
    }

    const page = inCat.slice(0, limit);

    // name the person behind each referral bonus
    const fromIds = [...new Set(page.map((i) => i._from).filter(Boolean))];
    const names = {};
    if (fromIds.length) {
      const snaps = await db.getAll(...fromIds.map((id) => db.collection("users").doc(id)));
      snaps.forEach((s) => { if (s.exists) names[s.id] = (s.data().fullName || "A member").split(" ")[0]; });
    }

    const items = page.map(({ _from, _repeat, _percent, ...i }) => {
      if (i.category === "referral" && _from) {
        i.note = `${names[_from] || "A member"} ${_repeat ? "bought another plan" : "bought their first plan"}${_percent ? ` · ${_percent}%` : ""}`;
      }
      return i;
    });

    res.json({ items, hasMore: inCat.length > limit, counts, summary });
  } catch (err) {
    next(err);
  }
};