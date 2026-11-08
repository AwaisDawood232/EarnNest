import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { getPromoSettings, shapeCode, isExpired, isFull } from "../services/promo.service.js";

const inc = FieldValue.increment;
const DAY = 864e5;
const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const ms = (ts) => ts?.toDate?.().getTime() ?? 0;
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });

const APPLIES = {
  first: "your first deposit",
  repeat: "deposits after your first",
  any: "any deposit",
};

/* ---------------- page data ---------------- */
export const getOverview = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const [settings, codeSnap, claimSnap, depSnap] = await Promise.all([
      getPromoSettings(),
      db.collection("promoCodes").where("public", "==", true).where("active", "==", true).limit(20).get(),
      db.collection("promoClaims").where("uid", "==", uid).limit(100).get(),
      db.collection("deposits").where("uid", "==", uid).where("status", "==", "approved").limit(200).get(),
    ]);

    const used = new Set(claimSnap.docs.map((d) => d.data().code));

    const available = codeSnap.docs
      .map((d) => shapeCode(d.id, d.data()))
      .filter((c) => !isExpired(c) && !isFull(c))
      .map((c) => ({
        code: c.code, title: c.title, description: c.description, type: c.type, value: c.value,
        maxBonus: c.maxBonus, applies: c.applies, minDeposit: c.minDeposit,
        expiresAt: c.expiresAt, left: c.maxUses > 0 ? c.maxUses - c.usedCount : null,
        used: used.has(c.code),
      }));

    // recent approved deposits inside the claim window
    const windowMs = settings.claimWindowDays * DAY;
    const deps = depSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
    const recent = deps
      .map((d, i) => ({ d, first: i === 0 }))
      .filter(({ d }) => Date.now() - ms(d.updatedAt) <= windowMs)
      .reverse()
      .slice(0, 5)
      .map(({ d, first }) => ({
        id: d.id, planName: d.planName, amount: num(d.amount), first,
        approvedAt: iso(d.updatedAt), promoCode: d.promoCode || null,
        claimBy: new Date(ms(d.updatedAt) + windowMs).toISOString(),
      }));

    const history = claimSnap.docs
      .map((d) => {
        const x = d.data();
        return { id: d.id, code: x.code, planName: x.planName, depositAmount: num(x.depositAmount), bonus: num(x.bonus), createdAt: iso(x.createdAt) };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    res.json({ claimWindowDays: settings.claimWindowDays, available, recent, history });
  } catch (err) {
    next(err);
  }
};

/* ---------------- claim a code ---------------- */
export const claim = async (req, res, next) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) throw httpError(400, "Enter a valid promo code");

    const uid = req.user.uid;
    const settings = await getPromoSettings();
    const windowMs = settings.claimWindowDays * DAY;

    const codeRef = db.collection("promoCodes").doc(code);
    const claimRef = db.collection("promoClaims").doc(`${code}_${uid}`);
    const userRef = db.collection("users").doc(uid);

    const result = await db.runTransaction(async (t) => {
      const [cSnap, usedSnap, uSnap, depSnap] = await Promise.all([
        t.get(codeRef),
        t.get(claimRef),
        t.get(userRef),
        t.get(db.collection("deposits").where("uid", "==", uid).where("status", "==", "approved").limit(200)),
      ]);

      if (!uSnap.exists) throw httpError(404, "User not found");
      if (uSnap.data().status === "suspended") throw httpError(403, "Your account is suspended");
      if (!cSnap.exists || cSnap.data().active === false) throw httpError(400, "This promo code is not valid");

      const c = shapeCode(cSnap.id, cSnap.data());
      if (isExpired(c)) throw httpError(400, "This promo code has expired");
      if (isFull(c)) throw httpError(400, "This promo code has reached its usage limit");
      if (usedSnap.exists) throw httpError(400, "You have already used this promo code");

      // find the deposit this bonus will be paid on
      const now = Date.now();
      const deps = depSnap.docs
        .map((d, i) => ({ id: d.id, ref: d.ref, ...d.data() }))
        .sort((a, b) => ms(a.createdAt) - ms(b.createdAt))
        .map((d, i) => ({ ...d, first: i === 0 }));

      const eligible = deps.filter(
        (d) =>
          !d.promoCode &&
          now - ms(d.updatedAt) <= windowMs &&
          num(d.amount) >= c.minDeposit &&
          (c.applies === "any" || (c.applies === "first") === d.first)
      );
      if (!eligible.length) {
        throw httpError(
          400,
          `No eligible deposit found. This code works on ${APPLIES[c.applies]}` +
            `${c.minDeposit > 0 ? ` of at least Rs ${c.minDeposit.toLocaleString("en-PK")}` : ""}` +
            `, approved in the last ${settings.claimWindowDays} day${settings.claimWindowDays > 1 ? "s" : ""}, that has no bonus yet.`
        );
      }
      const dep = eligible[eligible.length - 1]; // newest eligible deposit

      let bonus = c.type === "percent" ? round2((num(dep.amount) * c.value) / 100) : c.value;
      if (c.type === "percent" && c.maxBonus > 0) bonus = Math.min(bonus, c.maxBonus);
      bonus = round2(bonus);
      if (!(bonus > 0)) throw httpError(400, "This code gives no bonus on your deposit");

      const at = new Date();
      t.set(claimRef, { uid, code, depositId: dep.id, planName: dep.planName || "Plan", depositAmount: num(dep.amount), bonus, createdAt: at });
      t.update(codeRef, { usedCount: inc(1) });
      t.update(dep.ref, { promoCode: code, promoBonus: bonus });
      t.update(userRef, { "wallets.earning": inc(bonus), "stats.totalEarnings": inc(bonus), updatedAt: at });
      t.set(db.collection("transactions").doc(), {
        uid, type: "promo_bonus", title: `Promo bonus · ${code}`,
        note: `On your ${dep.planName || "plan"} deposit`, amount: bonus, status: "completed", createdAt: at,
      });

      return { bonus, code, planName: dep.planName || "Plan" };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

