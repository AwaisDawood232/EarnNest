import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { getSettings } from "../services/withdrawal.settings.js";
import { maskAccount } from "../utils/mask.js";

const col = db.collection("withdrawals");
const users = db.collection("users");
const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const rs = (n) => `Rs ${Number(n).toLocaleString("en-PK")}`;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const normalizePhone = (s) => String(s || "").replace(/[\s-]/g, "").replace(/^(\+92|0092|92)/, "0");

const bodySchema = z.object({
  methodId: z.string().min(1, "Select a withdrawal method"),
  wallet: z.enum(["earning", "referral"], { message: "Select a wallet" }),
  amount: z.coerce.number({ message: "Enter a valid amount" }).positive("Enter a valid amount"),
  accountNumber: z.string().regex(/^03\d{9}$/, "Enter a valid mobile account number (03XXXXXXXXX)"),
  accountName: z.string().trim().min(3, "Enter the account holder name").max(60),
});

export const getOverview = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const [settings, uSnap, hSnap] = await Promise.all([
      getSettings(),
      users.doc(uid).get(),
      col.where("uid", "==", uid).limit(100).get(),
    ]);
    if (!uSnap.exists) throw httpError(404, "User not found");
    const u = uSnap.data();

    const wallets = { earning: num(u.wallets?.earning), referral: num(u.wallets?.referral) };
    const blocked =
      u.status === "suspended" ? "Your account is suspended."
      : settings.requirePlan && !u.hasPlan ? "Purchase a plan to unlock withdrawals."
      : null;

    res.json({
      wallets,
      available: round2(wallets.earning + wallets.referral),
      blocked,
      maxPending: settings.maxPending,
      methods: Object.entries(settings.methods)
        .filter(([, m]) => m.enabled)
        .map(([id, m]) => ({ id, name: m.name, min: m.min, max: m.max, feePercent: m.feePercent })),
      history: hSnap.docs
        .map((d) => {
          const x = d.data();
          return {
            id: d.id, methodName: x.methodName, wallet: x.wallet,
            amount: x.amount, fee: x.fee, netAmount: x.netAmount,
            account: maskAccount(x.accountNumber), status: x.status,
            reason: x.reason || "", paymentRef: x.paymentRef || "",
            createdAt: iso(x.createdAt), reviewedAt: iso(x.reviewedAt),
          };
        })
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    });
  } catch (err) {
    next(err);
  }
};

export const createWithdrawal = async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse({ ...req.body, accountNumber: normalizePhone(req.body.accountNumber) });
    if (!parsed.success) throw httpError(400, parsed.error.issues[0].message);
    const { methodId, wallet, accountNumber, accountName } = parsed.data;
    const amount = round2(parsed.data.amount);
    const uid = req.user.uid;

    const settings = await getSettings();
    const method = settings.methods[methodId];
    if (!method || !method.enabled) throw httpError(400, "This withdrawal method is not available");
    if (amount < method.min || amount > method.max)
      throw httpError(400, `Amount must be between ${rs(method.min)} and ${rs(method.max)}`);

    const fee = round2((amount * method.feePercent) / 100);
    const userRef = users.doc(uid);

    // check + hold the money in ONE transaction
    await db.runTransaction(async (t) => {
      const [uSnap, pending] = await Promise.all([
        t.get(userRef),
        t.get(col.where("uid", "==", uid).where("status", "==", "pending")),
      ]);
      if (!uSnap.exists) throw httpError(404, "User not found");
      const u = uSnap.data();

      if (u.status === "suspended") throw httpError(403, "Your account is suspended");
      if (settings.requirePlan && !u.hasPlan) throw httpError(400, "Purchase a plan to unlock withdrawals");
      if (pending.size >= settings.maxPending)
        throw httpError(400, `You already have ${pending.size} request(s) awaiting approval. Please wait for them to be processed.`);
      if (num(u.wallets?.[wallet]) < amount) throw httpError(400, "Insufficient balance in the selected wallet");

      const now = new Date();
      t.set(col.doc(), {
        uid, email: req.user.email || "",
        methodId, methodName: method.name, wallet,
        amount, fee, netAmount: round2(amount - fee),
        accountNumber, accountName,
        status: "pending", createdAt: now, updatedAt: now,
      });
      t.update(userRef, { [`wallets.${wallet}`]: FieldValue.increment(-amount), updatedAt: now });
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
};

