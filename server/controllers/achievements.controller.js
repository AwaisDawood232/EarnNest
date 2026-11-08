import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { listAchievements, getEngagementSettings } from "../services/achievements.service.js";
import { dayKey } from "../services/referral.service.js";

const inc = FieldValue.increment;
const users = db.collection("users");
const DAY = 864e5;
const GRACE = 7 * DAY; // members can still claim an event for 7 days after it ends
const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[A-Za-z0-9_-]{1,60}$/.test(String(id));
const shortName = (n = "") => {
  const p = String(n).trim().split(/\s+/).filter(Boolean);
  return !p.length ? "A member" : p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0];
};

/* progress inside an event window */
async function eventProgress(uid, ev) {
  const start = ev.startsAt.getTime();
  const end = ev.endsAt.getTime();

  if (ev.kind === "invest") {
    const snap = await db.collection("deposits")
      .where("uid", "==", uid).where("status", "==", "approved").limit(500).get();
    return round2(snap.docs.reduce((a, d) => {
      const x = d.data();
      const t = x.updatedAt?.toDate?.().getTime() ?? 0;
      return t >= start && t <= end ? a + num(x.amount) : a;
    }, 0));
  }

  // "team": one referralDaily document per day
  const days = [];
  for (let t = Date.parse(dayKey(new Date(start))); t <= end && days.length < 70; t += DAY) days.push(dayKey(new Date(t)));
  if (!days.length) return 0;
  const snaps = await db.getAll(...days.map((d) => db.collection("referralDaily").doc(`${uid}_${d}`)));
  return round2(snaps.reduce((a, s) => a + (s.exists ? num(s.data().invest) : 0), 0));
}

/* ---------------- overview ---------------- */
export const getOverview = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const [list, settings, uSnap, postSnap, feedSnap, evSnap] = await Promise.all([
      listAchievements(),
      getEngagementSettings(),
      users.doc(uid).get(),
      db.collection("posts").where("active", "==", true).limit(30).get(),
      db.collection("achievementFeed").orderBy("createdAt", "desc").limit(8).get(),
      db.collection("events").where("active", "==", true).limit(30).get(),
    ]);
    if (!uSnap.exists) throw httpError(404, "User not found");
    const u = uSnap.data();
    const now = Date.now();

    /* roadmap */
    const claimed = u.claimedAchievements || [];
    const own = num(u.stats?.ownInvestment);
    const team = num(u.stats?.teamInvestment);
    const firstIdx = list.findIndex((a) => !claimed.includes(a.id));
    const nextIdx = list.findIndex((a, i) => i > firstIdx && firstIdx >= 0 && !claimed.includes(a.id));

    const items = list.map((a, i) => {
      const met = own >= a.ownTarget && team >= a.teamTarget;
      const ownPct = a.ownTarget > 0 ? Math.min(own / a.ownTarget, 1) : 1;
      const teamPct = a.teamTarget > 0 ? Math.min(team / a.teamTarget, 1) : 1;
      let status = "locked";
      if (claimed.includes(a.id)) status = "claimed";
      else if (i === firstIdx) status = met ? "ready" : "current";
      else if (i === nextIdx) status = "next";
      return {
        ...a, status, met,
        progress: met ? 100 : Math.min(Math.floor(((ownPct + teamPct) / 2) * 100), 99),
        ownNeed: Math.max(a.ownTarget - own, 0),
        teamNeed: Math.max(a.teamTarget - team, 0),
      };
    });

    /* daily check-in */
    const today = dayKey();
    const yesterday = dayKey(new Date(now - DAY));
    const ck = u.checkin || {};
    const alive = ck.last === today || ck.last === yesterday;
    const streak = alive ? num(ck.streak) : 0;
    const checkedToday = ck.last === today;
    const n = settings.streakDays;
    const checkin = {
      enabled: settings.checkinEnabled,
      blocked: settings.requirePlan && !u.hasPlan ? "Purchase a plan to unlock daily check-in." : null,
      checkedToday, streak,
      filled: checkedToday ? ((streak - 1) % n) + 1 : streak % n,
      reward: settings.checkinReward, streakDays: n, streakBonus: settings.streakBonus,
      total: num(ck.total),
    };

    /* events */
    const claimedEv = u.claimedEvents || [];
    const evs = evSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => e.startsAt?.toDate && e.endsAt?.toDate && e.endsAt.toDate().getTime() + GRACE > now)
      .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
      .slice(0, 6);

    const events = await Promise.all(evs.map(async (e) => {
      const startsAt = e.startsAt.toDate(), endsAt = e.endsAt.toDate();
      const started = startsAt.getTime() <= now;
      const progress = started ? await eventProgress(uid, { kind: e.kind, startsAt, endsAt }) : 0;
      const done = progress >= num(e.target);
      const status = claimedEv.includes(e.id) ? "claimed"
        : !started ? "upcoming"
        : done ? "claimable"
        : endsAt.getTime() < now ? "ended" : "live";
      return {
        id: e.id, title: e.title, description: e.description || "", icon: e.icon || "🎯",
        kind: e.kind, target: num(e.target), reward: num(e.reward),
        startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(),
        progress, pct: Math.min(Math.floor((progress / num(e.target)) * 100), 100), status,
      };
    }));

    /* posts + feed */
    const posts = postSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) ||
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 10)
      .map((p) => ({ id: p.id, title: p.title, body: p.body, kind: p.kind, pinned: !!p.pinned, createdAt: iso(p.createdAt) }));

    const feed = feedSnap.docs.map((d) => {
      const f = d.data();
      return { id: d.id, name: f.name, achName: f.achName, icon: f.icon, createdAt: iso(f.createdAt) };
    });

    res.json({
      serverNow: new Date().toISOString(),
      own, team,
      level: { claimed: items.filter((i) => i.status === "claimed").length, total: items.length },
      hero: items[firstIdx] || null,
      achievements: items,
      totals: { available: items.reduce((a, i) => a + i.reward, 0), claimed: num(u.stats?.achievementEarned) },
      rewardsWallet: num(u.wallets?.rewards),
      checkin, events, posts, feed,
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------- claim an achievement ---------------- */
export const claimAchievement = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Achievement not found");
    const uid = req.user.uid;
    const list = await listAchievements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw httpError(404, "Achievement not found");
    const userRef = users.doc(uid);

    const result = await db.runTransaction(async (t) => {
      const [uSnap, aSnap] = await Promise.all([t.get(userRef), t.get(db.collection("achievements").doc(id))]);
      if (!uSnap.exists) throw httpError(404, "User not found");
      if (!aSnap.exists || aSnap.data().active === false) throw httpError(404, "Achievement not found");
      const u = uSnap.data(), a = aSnap.data();

      if (u.status === "suspended") throw httpError(403, "Your account is suspended");
      const claimed = u.claimedAchievements || [];
      if (claimed.includes(id)) throw httpError(400, "You already claimed this reward");
      const missing = list.slice(0, idx).find((x) => !claimed.includes(x.id));
      if (missing) throw httpError(400, `Claim “${missing.name}” first`);
      if (num(u.stats?.ownInvestment) < num(a.ownTarget) || num(u.stats?.teamInvestment) < num(a.teamTarget))
        throw httpError(400, "You have not reached this milestone yet");

      const reward = num(a.reward);
      const now = new Date();
      t.update(userRef, {
        "wallets.rewards": inc(reward),
        "stats.totalEarnings": inc(reward),
        "stats.achievementEarned": inc(reward),
        claimedAchievements: FieldValue.arrayUnion(id),
        updatedAt: now,
      });
      t.set(db.collection("transactions").doc(), {
        uid, type: "achievement_reward", note: a.name, amount: reward, status: "completed", createdAt: now,
      });
      t.set(db.collection("achievementFeed").doc(), {
        name: shortName(u.fullName), achName: a.name, icon: a.icon || "🏅", createdAt: now,
      });
      return { reward, name: a.name, icon: a.icon || "🏅" };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/* ---------------- claim an event ---------------- */
export const claimEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Event not found");
    const uid = req.user.uid;

    const evSnap = await db.collection("events").doc(id).get();
    if (!evSnap.exists || evSnap.data().active === false) throw httpError(404, "Event not found");
    const e = evSnap.data();
    const startsAt = e.startsAt.toDate(), endsAt = e.endsAt.toDate();
    const now = Date.now();
    if (now < startsAt.getTime()) throw httpError(400, "This event has not started yet");
    if (now > endsAt.getTime() + GRACE) throw httpError(400, "The claim period for this event is over");

    const progress = await eventProgress(uid, { kind: e.kind, startsAt, endsAt });
    if (progress < num(e.target)) throw httpError(400, "You have not reached the goal yet");

    const userRef = users.doc(uid);
    await db.runTransaction(async (t) => {
      const uSnap = await t.get(userRef);
      if (!uSnap.exists) throw httpError(404, "User not found");
      const u = uSnap.data();
      if (u.status === "suspended") throw httpError(403, "Your account is suspended");
      if ((u.claimedEvents || []).includes(id)) throw httpError(400, "You already claimed this reward");

      const reward = num(e.reward);
      const at = new Date();
      t.update(userRef, {
        "wallets.rewards": inc(reward),
        "stats.totalEarnings": inc(reward),
        claimedEvents: FieldValue.arrayUnion(id),
        updatedAt: at,
      });
      t.set(db.collection("transactions").doc(), {
        uid, type: "event_reward", title: `Event reward · ${e.title}`, note: "Event goal completed",
        amount: reward, status: "completed", createdAt: at,
      });
    });

    res.json({ reward: num(e.reward), title: e.title, icon: e.icon || "🎯" });
  } catch (err) {
    next(err);
  }
};

/* ---------------- daily check-in ---------------- */
export const checkin = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const s = await getEngagementSettings();
    if (!s.checkinEnabled) throw httpError(400, "Daily check-in is not available right now");
    const userRef = users.doc(uid);

    const out = await db.runTransaction(async (t) => {
      const uSnap = await t.get(userRef);
      if (!uSnap.exists) throw httpError(404, "User not found");
      const u = uSnap.data();
      if (u.status === "suspended") throw httpError(403, "Your account is suspended");
      if (s.requirePlan && !u.hasPlan) throw httpError(400, "Purchase a plan to unlock daily check-in");

      const today = dayKey();
      const yesterday = dayKey(new Date(Date.now() - DAY));
      const ck = u.checkin || {};
      if (ck.last === today) throw httpError(400, "You already checked in today");

      const streak = ck.last === yesterday ? num(ck.streak) + 1 : 1;
      const bonus = streak % s.streakDays === 0 ? num(s.streakBonus) : 0;
      const amount = round2(num(s.checkinReward) + bonus);
      const now = new Date();

      t.update(userRef, {
        ...(amount > 0 ? { "wallets.rewards": inc(amount), "stats.totalEarnings": inc(amount) } : {}),
        "checkin.last": today,
        "checkin.streak": streak,
        "checkin.total": inc(1),
        updatedAt: now,
      });
      if (amount > 0) {
        t.set(db.collection("transactions").doc(), {
          uid, type: "checkin_reward",
          title: bonus > 0 ? `Daily check-in · Day ${streak} bonus` : "Daily check-in",
          note: `${streak}-day streak`, amount, status: "completed", createdAt: now,
        });
      }
      return { amount, streak, bonus };
    });

    res.json(out);
  } catch (err) {
    next(err);
  }
};


