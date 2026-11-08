import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { dayKey } from "../services/referral.service.js";
import {
  getAdSettings, shapeAd, srcOf, thumbOf, hasActivePlan, gate, limitOf, todayStats, cooldownLeft,
} from "../services/ads.service.js";

const inc = FieldValue.increment;
const users = db.collection("users");
const views = db.collection("adViews");
const SESSION_MAX = 6 * 3600e3;
const num = (v) => Number(v || 0);
const ms = (ts) => ts?.toDate?.().getTime() ?? 0;
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[A-Za-z0-9]{10,40}$/.test(String(id));

/* ---------------- page data ---------------- */
export const getOverview = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const [s, uSnap, plans, adSnap, vSnap] = await Promise.all([
      getAdSettings(),
      users.doc(uid).get(),
      db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").count().get(),
      db.collection("ads").where("active", "==", true).limit(100).get(),
      views.where("uid", "==", uid).limit(400).get(),
    ]);
    if (!uSnap.exists) throw httpError(404, "User not found");
    const u = uSnap.data();
    const activePlans = plans.data().count;
    const hasPlan = activePlans > 0;

    const blocked = gate(u, s, hasPlan);
    const st = todayStats(u);
    const limit = blocked ? 0 : limitOf(s, hasPlan);

    const today = dayKey();
    const mine = vSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const doneToday = new Set(mine.filter((v) => v.day === today && v.status === "completed").map((v) => v.adId));

    const ads = adSnap.docs
      .map((d) => shapeAd(d.id, d.data()))
      .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))
      .map((a) => ({
        id: a.id, title: a.title, description: a.description, type: a.type,
        requiredSec: a.requiredSec, reward: a.reward, thumb: thumbOf(a), watched: doneToday.has(a.id),
      }));

    const history = mine
      .filter((v) => v.status === "completed")
      .sort((a, b) => ms(b.completedAt) - ms(a.completedAt))
      .slice(0, 8)
      .map((v) => ({ id: v.id, title: v.adTitle, reward: num(v.reward), seconds: num(v.watchedSec), at: iso(v.completedAt) }));

    res.json({
      enabled: s.enabled, requirePlan: s.requirePlan, blocked, activePlans,
      wallet: num(u.wallets?.earning),
      limit, watchedToday: st.count, remaining: Math.max(limit - st.count, 0),
      seconds: st.seconds, earnedToday: st.earned,
      cooldownLeft: blocked ? 0 : cooldownLeft(u, s),
      ads, history,
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------- start watching ---------------- */
export const start = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "This ad is not available");
    const uid = req.user.uid;

    const [s, adSnap, hasPlan] = await Promise.all([getAdSettings(), db.collection("ads").doc(id).get(), hasActivePlan(uid)]);
    if (!adSnap.exists || adSnap.data().active === false) throw httpError(404, "This ad is not available");
    const ad = shapeAd(id, adSnap.data());

    const day = dayKey();
    const viewRef = views.doc(`${uid}_${id}_${day}`);
    const userRef = users.doc(uid);

    await db.runTransaction(async (t) => {
      const [uSnap, vSnap] = await Promise.all([t.get(userRef), t.get(viewRef)]);
      if (!uSnap.exists) throw httpError(404, "User not found");
      const u = uSnap.data();

      const blocked = gate(u, s, hasPlan);
      if (blocked) throw httpError(403, blocked);
      if (vSnap.exists && vSnap.data().status === "completed") throw httpError(400, "You already watched this ad today. Come back tomorrow.");

      const limit = limitOf(s, hasPlan);
      if (todayStats(u).count >= limit) throw httpError(400, `You reached today's limit of ${limit} ads.`);
      const wait = cooldownLeft(u, s);
      if (wait > 0) throw httpError(400, `Please wait ${wait}s before the next ad.`);

      const now = new Date();
      t.set(viewRef, {
        uid, adId: id, adTitle: ad.title, name: u.fullName || "Member", email: u.email || "", day,
        status: "started", requiredSec: ad.requiredSec, reward: ad.reward, watchedSec: 0,
        attempts: num(vSnap.data()?.attempts) + 1,
        startedAt: now, updatedAt: now, createdAt: vSnap.exists ? vSnap.data().createdAt : now,
      });
    });

    res.json({
      viewId: viewRef.id,
      ad: { id, title: ad.title, type: ad.type, videoId: ad.videoId, src: srcOf(ad), requiredSec: ad.requiredSec, reward: ad.reward },
    });
  } catch (err) {
    next(err);
  }
};

/* ---------------- finish and get paid ---------------- */
export const complete = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { viewId } = req.params;
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(viewId) || !viewId.startsWith(`${uid}_`)) throw httpError(404, "Session not found");
    const watched = Math.min(Math.max(Number(req.body.watchedSec) || 0, 0), 86400);

    const s = await getAdSettings();
    const viewRef = views.doc(viewId);
    const userRef = users.doc(uid);

    const out = await db.runTransaction(async (t) => {
      const vSnap = await t.get(viewRef);
      if (!vSnap.exists) throw httpError(404, "Session not found");
      const v = vSnap.data();
      if (v.uid !== uid) throw httpError(403, "Not allowed");
      if (v.status === "completed") throw httpError(400, "The reward for this ad was already collected");

      const [uSnap, adSnap, planSnap] = await Promise.all([
        t.get(userRef),
        t.get(db.collection("ads").doc(v.adId)),
        t.get(db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").limit(1)),
      ]);
      if (!uSnap.exists) throw httpError(404, "User not found");
      const u = uSnap.data();

      const now = Date.now();
      if (v.day !== dayKey() || now - ms(v.startedAt) > SESSION_MAX) throw httpError(400, "This session expired. Please start the ad again.");

      const need = num(v.requiredSec);
      const elapsed = (now - ms(v.startedAt)) / 1000;
      if (elapsed < need - 1 || watched < need * 0.9) throw httpError(400, "Please watch the full video to earn the reward.");

      const hasPlan = !planSnap.empty;
      const blocked = gate(u, s, hasPlan);
      if (blocked) throw httpError(403, blocked);

      const st = todayStats(u);
      const limit = limitOf(s, hasPlan);
      if (st.count >= limit) throw httpError(400, `You reached today's limit of ${limit} ads.`);

      const reward = num(v.reward);
      const at = new Date();
      const today = dayKey();
      const sameDay = u.stats?.todayDate === today;

      t.update(viewRef, {
        status: "completed", watchedSec: Math.round(watched), elapsedSec: Math.round(elapsed),
        completedAt: at, updatedAt: at,
      });
      t.update(userRef, {
        "wallets.earning": inc(reward),
        "stats.totalEarnings": inc(reward),
        "stats.todayEarnings": sameDay ? inc(reward) : reward,
        "stats.todayDate": today,
        adStats: { day: today, count: st.count + 1, seconds: st.seconds + need, earned: st.earned + reward, lastAt: at },
        updatedAt: at,
      });
      if (adSnap.exists) t.update(adSnap.ref, { views: inc(1), paid: inc(reward) });
      t.set(db.collection("transactions").doc(), {
        uid, type: "ad_reward", title: `Ad reward · ${v.adTitle}`, note: `Watched ${need}s`,
        amount: reward, status: "completed", createdAt: at,
      });

      return { reward, title: v.adTitle, remaining: Math.max(limit - (st.count + 1), 0) };
    });

    res.json(out);
  } catch (err) {
    next(err);
  }
};

