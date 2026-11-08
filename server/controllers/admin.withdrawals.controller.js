import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { getSettings, saveSettings } from "../services/withdrawal.settings.js";

const col = db.collection("withdrawals");
const users = db.collection("users");
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[A-Za-z0-9]{1,40}$/.test(String(id));
const sum = (docs, pred = () => true) =>
  round2(docs.reduce((a, d) => (pred(d.data()) ? a + num(d.data().amount) : a), 0));

/* ---------- bell / badge counts ---------- */
export const notifications = async (req, res, next) => {
  try {
    const count = async (name) =>
      (await db.collection(name).where("status", "==", "pending").count().get()).data().count;
    const [deposits, withdrawals] = await Promise.all([count("deposits"), count("withdrawals")]);
    res.json({ deposits, withdrawals });
  } catch (err) {
    next(err);
  }
};

/* ---------- list ---------- */
export const list = async (req, res, next) => {
  try {
    const status = String(req.query.status || "pending");
    const q = ["pending", "approved", "rejected"].includes(status) ? col.where("status", "==", status) : col;
    const snap = await q.limit(200).get();

    const uids = [...new Set(snap.docs.map((d) => d.data().uid))];
    const uSnaps = uids.length ? await db.getAll(...uids.map((id) => users.doc(id))) : [];
    const umap = Object.fromEntries(uSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()]));

    const withdrawals = snap.docs
      .map((d) => {
        const x = d.data();
        const u = umap[x.uid] || {};
        return {
          id: d.id, status: x.status, reason: x.reason || "",
          methodName: x.methodName, wallet: x.wallet,
          amount: x.amount, fee: x.fee, netAmount: x.netAmount,
          accountNumber: x.accountNumber, accountName: x.accountName,
          email: x.email, customerName: u.fullName || "Removed member", phone: u.phone || "—",
          createdAt: iso(x.createdAt), reviewedAt: iso(x.reviewedAt),
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const count = async (s) => (await col.where("status", "==", s).count().get()).data().count;
    const [pending, approved, rejected] = await Promise.all([count("pending"), count("approved"), count("rejected")]);
    res.json({ withdrawals, counts: { pending, approved, rejected, all: pending + approved + rejected } });
  } catch (err) {
    next(err);
  }
};

/* ---------- one request + the member's money history ---------- */
export const detail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Request not found");
    const wSnap = await col.doc(id).get();
    if (!wSnap.exists) throw httpError(404, "Request not found");
    const w = wSnap.data();
    const uid = w.uid;

    const [uSnap, deps, wds, plans, direct] = await Promise.all([
      users.doc(uid).get(),
      db.collection("deposits").where("uid", "==", uid).limit(500).get(),
      col.where("uid", "==", uid).limit(500).get(),
      db.collection("userPlans").where("uid", "==", uid).limit(200).get(),
      users.where("referredBy", "==", uid).count().get(),
    ]);
    const u = uSnap.exists ? uSnap.data() : {};

    const totalIn = sum(deps.docs, (x) => x.status === "approved");
    const paidBefore = sum(wds.docs, (x) => x.status === "approved");
    const otherPending = sum(wds.docs.filter((d) => d.id !== id), (x) => x.status === "pending");
    const activePlans = plans.docs.filter((d) => d.data().status === "active");

    const words = (s = "") => s.toLowerCase().split(/\s+/).filter((x) => x.length > 1);
    const a = words(w.accountName), b = words(u.fullName);

    res.json({
      member: {
        id: uid, name: u.fullName || "Removed member", email: u.email || w.email, phone: u.phone || "—",
        country: u.country || "—", status: u.status || "—", joinedAt: iso(u.createdAt),
        directReferrals: direct.data().count,
        wallets: { earning: num(u.wallets?.earning), referral: num(u.wallets?.referral) },
        removed: !uSnap.exists,
      },
      summary: {
        totalIn,
        approvedPayments: deps.docs.filter((d) => d.data().status === "approved").length,
        pendingPayments: deps.docs.filter((d) => d.data().status === "pending").length,
        paidBefore,
        withdrawalsCount: wds.docs.filter((d) => d.data().status === "approved").length,
        otherPending,
        activePlans: activePlans.length,
        invested: sum(activePlans),
        totalEarned: num(u.stats?.totalEarnings),
        net: round2(totalIn - paidBefore - (w.status === "pending" ? w.amount : 0)),
      },
      flags: { nameMismatch: b.length > 0 && !a.some((x) => b.includes(x)) },
      recent: wds.docs
        .filter((d) => d.id !== id)
        .map((d) => ({ id: d.id, amount: d.data().amount, status: d.data().status, methodName: d.data().methodName, createdAt: iso(d.data().createdAt) }))
        .sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || ""))
        .slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
};

/* ---------- approve = money was sent manually ---------- */
export const approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Request not found");
    const paymentRef = String(req.body.paymentRef || "").trim().slice(0, 40);

    await db.runTransaction(async (t) => {
      const wRef = col.doc(id);
      const wSnap = await t.get(wRef);
      if (!wSnap.exists) throw httpError(404, "Request not found");
      const w = wSnap.data();
      if (w.uid === req.user.uid) throw httpError(403, "You cannot review your own request");
      if (w.status !== "pending") throw httpError(400, `Already ${w.status}`);

      const uRef = users.doc(w.uid);
      const uSnap = await t.get(uRef);
      const now = new Date();

      t.update(wRef, { status: "approved", paymentRef, reviewedBy: req.user.uid, reviewedAt: now, updatedAt: now });
      if (uSnap.exists) t.update(uRef, { "stats.totalWithdrawn": FieldValue.increment(w.amount), updatedAt: now });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/* ---------- reject = money goes back to the member's wallet ---------- */
export const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Request not found");
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 3 || reason.length > 200) throw httpError(400, "Enter a reason (3 to 200 characters)");

    await db.runTransaction(async (t) => {
      const wRef = col.doc(id);
      const wSnap = await t.get(wRef);
      if (!wSnap.exists) throw httpError(404, "Request not found");
      const w = wSnap.data();
      if (w.uid === req.user.uid) throw httpError(403, "You cannot review your own request");
      if (w.status !== "pending") throw httpError(400, `Already ${w.status}`);

      const uRef = users.doc(w.uid);
      const uSnap = await t.get(uRef);
      const now = new Date();

      t.update(wRef, { status: "rejected", reason, refunded: uSnap.exists, reviewedBy: req.user.uid, reviewedAt: now, updatedAt: now });
      if (uSnap.exists) t.update(uRef, { [`wallets.${w.wallet}`]: FieldValue.increment(w.amount), updatedAt: now });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/* ---------- settings (limits, fees, on/off) ---------- */
const methodSchema = z
  .object({
    min: z.coerce.number({ message: "Enter a minimum amount" }).positive("Minimum must be greater than 0").max(100_000_000),
    max: z.coerce.number({ message: "Enter a maximum amount" }).positive("Maximum must be greater than 0").max(100_000_000),
    feePercent: z.coerce.number({ message: "Enter a fee (0 for none)" }).min(0, "Fee cannot be negative").max(50, "Fee cannot exceed 50%"),
    enabled: z.boolean(),
  })
  .refine((m) => m.max >= m.min, { message: "Maximum must be at least the minimum" });

const settingsSchema = z.object({
  requirePlan: z.boolean(),
  maxPending: z.coerce.number().int("Must be a whole number").min(1, "At least 1").max(10, "Maximum 10"),
  methods: z.object({ easypaisa: methodSchema, jazzcash: methodSchema, nayapay: methodSchema }),
});

export const getWithdrawalSettings = async (req, res, next) => {
  try {
    res.json({ settings: await getSettings() });
  } catch (err) {
    next(err);
  }
};

export const updateWithdrawalSettings = async (req, res, next) => {
  try {
    const p = settingsSchema.safeParse(req.body);
    if (!p.success) {
      const i = p.error.issues[0];
      const where = i.path[0] === "methods" && i.path[1] ? `${i.path[1]}: ` : "";
      throw httpError(400, where + i.message);
    }
    await saveSettings(p.data, req.user.uid);
    res.json({ settings: await getSettings() });
  } catch (err) {
    next(err);
  }
};
