import path from "path";
import { db } from "../config/firebase.js";
import { RECEIPT_DIR } from "../middleware/upload.middleware.js";
import { approveDeposit } from "../services/deposit.service.js";

const deposits = db.collection("deposits");
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });

export const listDeposits = async (req, res, next) => {
  try {
    const status = String(req.query.status || "pending");
    const query = ["pending", "approved", "rejected"].includes(status)
      ? deposits.where("status", "==", status)
      : deposits;
    const snap = await query.limit(200).get();

    // attach customer name + phone
    const uids = [...new Set(snap.docs.map((d) => d.data().uid))];
    const userSnaps = uids.length ? await db.getAll(...uids.map((id) => db.collection("users").doc(id))) : [];
    const users = Object.fromEntries(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data()]));

    const list = snap.docs
      .map((d) => {
        const x = d.data();
        const u = users[x.uid] || {};
        return {
          id: d.id,
          status: x.status,
          reason: x.reason || "",
          planName: x.planName,
          amount: x.amount,
          methodName: x.methodName,
          paidTo: x.accountNumber ? `${x.accountName} · ${x.accountNumber}` : "",
          transactionId: x.transactionId,
          reference: x.reference,
          email: x.email,
          customerName: u.fullName || "—",
          phone: u.phone || "—",
          hasBonusHistory: !!u.referralBonusPaid,
          createdAt: iso(x.createdAt),
          reviewedAt: iso(x.reviewedAt),
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    const count = async (s) => (await deposits.where("status", "==", s).count().get()).data().count;
    const [pending, approved, rejected] = await Promise.all([count("pending"), count("approved"), count("rejected")]);

    res.json({ deposits: list, counts: { pending, approved, rejected, all: pending + approved + rejected } });
  } catch (err) {
    next(err);
  }
};

// Receipts are private: only admins can fetch them, by deposit id
export const getReceipt = async (req, res, next) => {
  try {
    const snap = await deposits.doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ message: "Payment not found" });

    const file = path.basename(snap.data().receiptFile || "");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.sendFile(file, { root: RECEIPT_DIR }, (err) => {
      if (err && !res.headersSent) res.status(404).json({ message: "Receipt file not found" });
    });
  } catch (err) {
    next(err);
  }
};

export const approve = async (req, res, next) => {
  try {
    const ref = deposits.doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Payment not found");
    if (snap.data().uid === req.user.uid) throw httpError(403, "You cannot review your own payment");

    const result = await approveDeposit(req.params.id);
    await ref.update({ reviewedBy: req.user.uid, reviewedAt: new Date() });
    res.json({ ok: true, ...result });
  } catch (err) {
    if (/^Already|not found|no longer/i.test(err.message)) err.status = err.status || 400;
    next(err);
  }
};

export const reject = async (req, res, next) => {
  try {
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 3 || reason.length > 200) throw httpError(400, "Enter a reason (3 to 200 characters)");

    const ref = deposits.doc(req.params.id);
    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw httpError(404, "Payment not found");
      const d = snap.data();
      if (d.uid === req.user.uid) throw httpError(403, "You cannot review your own payment");
      if (d.status !== "pending") throw httpError(400, `Already ${d.status}`);
      t.update(ref, { status: "rejected", reason, reviewedBy: req.user.uid, reviewedAt: new Date(), updatedAt: new Date() });
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
