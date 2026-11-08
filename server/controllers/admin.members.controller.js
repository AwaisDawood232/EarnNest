import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "../config/firebase.js";
import { AVATAR_DIR } from "../middleware/avatar.middleware.js";
import { avatarUrlOf } from "../utils/avatar.js";

const users = db.collection("users");
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validUid = (id) => /^[A-Za-z0-9]{1,128}$/.test(String(id));

const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Enter a reason (3 to 200 characters)").max(200, "Reason is too long"),
});

/* ---------- list + totals ---------- */
export const listMembers = async (req, res, next) => {
  try {
    const [userSnap, planSnap, depSnap] = await Promise.all([
      users.select("fullName", "email", "phone", "country", "role", "status", "createdAt", "avatar", "photoURL").limit(2000).get(),
      db.collection("userPlans").select("uid", "status", "amount", "earned", "dailyProfit", "daysPaid", "durationDays").get(),
      db.collection("deposits").where("status", "==", "approved").select("amount").get(),
    ]);

    const per = {};
    let activePlans = 0, activePlanValue = 0, rewardsPaid = 0, remainingPayouts = 0;

    planSnap.docs.forEach((d) => {
      const p = d.data();
      const x = (per[p.uid] ||= { active: 0, total: 0, invested: 0, earned: 0 });
      x.total++;
      x.invested += num(p.amount);
      x.earned += num(p.earned);
      rewardsPaid += num(p.earned);
      if (p.status === "active") {
        x.active++;
        activePlans++;
        activePlanValue += num(p.amount);
        remainingPayouts += num(p.dailyProfit) * Math.max(num(p.durationDays) - num(p.daysPaid), 0);
      }
    });

    const revenue = depSnap.docs.reduce((a, d) => a + num(d.data().amount), 0);

    const members = userSnap.docs
      .filter((d) => d.data().role !== "admin")
      .map((d) => {
        const u = d.data();
        const x = per[d.id] || { active: 0, total: 0, invested: 0, earned: 0 };
        return {
          id: d.id,
          name: u.fullName || "Member",
          email: u.email || "",
          phone: u.phone || "",
          country: u.country || "",
          status: u.status || "active",
          createdAt: iso(u.createdAt),
          avatarUrl: avatarUrlOf(u),
          activePlans: x.active,
          totalPlans: x.total,
          invested: round2(x.invested),
          earned: round2(x.earned),
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const activeMembers = members.filter((m) => m.activePlans > 0).length;
    res.json({
      stats: {
        totalMembers: members.length,
        activeMembers,
        inactiveMembers: members.length - activeMembers,
        suspended: members.filter((m) => m.status === "suspended").length,
        revenue: round2(revenue),
        activePlans,
        activePlanValue: round2(activePlanValue),
        rewardsPaid: round2(rewardsPaid),
        remainingPayouts: round2(remainingPayouts),
        net: round2(revenue - rewardsPaid),
      },
      members,
    });
  } catch (err) {
    next(err);
  }
};

/* ---------- one member ---------- */
export const getMember = async (req, res, next) => {
  try {
    const { uid } = req.params;
    if (!validUid(uid)) throw httpError(404, "Member not found");
    const snap = await users.doc(uid).get();
    if (!snap.exists) throw httpError(404, "Member not found");
    const u = snap.data();

    const [plans, deps, direct, parent] = await Promise.all([
      db.collection("userPlans").where("uid", "==", uid).limit(100).get(),
      db.collection("deposits").where("uid", "==", uid).limit(100).get(),
      users.where("referredBy", "==", uid).count().get(),
      u.referredBy ? users.doc(u.referredBy).get() : null,
    ]);

    const byDate = (a, b) => (b.date || "").localeCompare(a.date || "");
    res.json({
      member: {
        id: uid,
        name: u.fullName || "Member",
        email: u.email || "",
        phone: u.phone || "",
        country: u.country || "",
        role: u.role || "user",
        status: u.status || "active",
        suspendReason: u.suspendReason || "",
        referralCode: u.referralCode || "",
        referredByName: parent?.exists ? parent.data().fullName || "Member" : "",
        directReferrals: direct.data().count,
        createdAt: iso(u.createdAt),
        avatarUrl: avatarUrlOf(u),
        wallets: {
          deposit: num(u.wallets?.deposit), earning: num(u.wallets?.earning),
          referral: num(u.wallets?.referral), rewards: num(u.wallets?.rewards),
        },
      },
      plans: plans.docs.map((d) => {
        const p = d.data();
        return {
          id: d.id, name: p.name, amount: num(p.amount), status: p.status,
          daysPaid: num(p.daysPaid), durationDays: num(p.durationDays), earned: num(p.earned),
          date: iso(p.startedAt),
        };
      }).sort(byDate),
      deposits: deps.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id, planName: x.planName, amount: num(x.amount), methodName: x.methodName,
          status: x.status, date: iso(x.createdAt),
        };
      }).sort(byDate),
    });
  } catch (err) {
    next(err);
  }
};

/* ---------- guards shared by the two actions ---------- */
async function loadTarget(req) {
  const { uid } = req.params;
  if (!validUid(uid)) throw httpError(404, "Member not found");
  if (uid === req.user.uid) throw httpError(400, "You cannot do this to your own account");
  const snap = await users.doc(uid).get();
  if (!snap.exists) throw httpError(404, "Member not found");
  if (snap.data().role === "admin") throw httpError(403, "Admin accounts cannot be changed here");
  return { uid, ref: snap.ref, data: snap.data() };
}

/* ---------- suspend / reactivate ---------- */
export const setSuspended = async (req, res, next) => {
  try {
    const { uid, ref } = await loadTarget(req);
    const suspend = req.body.suspend !== false;

    if (suspend) {
      const p = reasonSchema.safeParse(req.body);
      if (!p.success) throw httpError(400, p.error.issues[0].message);
      await ref.update({ status: "suspended", suspendReason: p.data.reason, suspendedAt: new Date(), updatedAt: new Date() });
      await auth.updateUser(uid, { disabled: true }).catch(() => {});
      await auth.revokeRefreshTokens(uid).catch(() => {});
    } else {
      await ref.update({
        status: "active", suspendReason: FieldValue.delete(), suspendedAt: FieldValue.delete(), updatedAt: new Date(),
      });
      await auth.updateUser(uid, { disabled: false }).catch(() => {});
    }
    res.json({ ok: true, status: suspend ? "suspended" : "active" });
  } catch (err) {
    next(err);
  }
};

/* ---------- permanent removal ---------- */
export const removeMember = async (req, res, next) => {
  try {
    const { uid, ref, data } = await loadTarget(req);
    const p = reasonSchema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);

    const [plans, pending, pendingW] = await Promise.all([
  db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").get(),
  db.collection("deposits").where("uid", "==", uid).where("status", "==", "pending").get(),
  db.collection("withdrawals").where("uid", "==", uid).where("status", "==", "pending").get(),
]);

    const now = new Date();
    const batch = db.batch();
    plans.docs.forEach((d) => batch.update(d.ref, { status: "cancelled", cancelledAt: now }));

    pending.docs.forEach((d) =>
      batch.update(d.ref, { status: "rejected", reason: "Account removed", updatedAt: now })
    );
    pendingW.docs.forEach((d) => batch.update(d.ref, { status: "rejected", reason: "Account removed", updatedAt: now }));
    
    batch.set(db.collection("removedUsers").doc(uid), {
      uid, email: data.email || "", fullName: data.fullName || "",
      reason: p.data.reason, removedBy: req.user.uid, removedAt: now,
    });
    batch.delete(ref);
    await batch.commit();

    if (data.avatar) await fs.unlink(path.join(AVATAR_DIR, path.basename(data.avatar))).catch(() => {});
    await auth.deleteUser(uid).catch((e) => {
      if (e.code !== "auth/user-not-found") throw e;
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

