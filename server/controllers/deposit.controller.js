import fs from "fs/promises";
import { z } from "zod";
import { db } from "../config/firebase.js";
// import { getPlan } from "../config/plans.config.js";
import { getPlan } from "../services/plans.service.js";
import { getMethod } from "../services/payment.service.js";
import path from "path";
import { RECEIPT_DIR } from "../middleware/upload.middleware.js";

const deposits = db.collection("deposits");

const bodySchema = z.object({
  planId: z.string().min(1),
  methodId: z.string().min(1),
  reference: z.string().regex(/^[A-Z0-9]{8,16}$/, "Invalid order reference"),
  transactionId: z.string().regex(/^[A-Z0-9]{6,30}$/, "Enter a valid transaction ID (letters and numbers only)"),
});

// confirm the file really is an image (not just a renamed file)
async function isRealImage(path) {
  const fh = await fs.open(path, "r");
  const buf = Buffer.alloc(12);
  await fh.read(buf, 0, 12, 0);
  await fh.close();
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const webp = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  return jpeg || png || webp;
}

export const createDeposit = async (req, res, next) => {
  const file = req.file;
  const fail = async (status, message) => {
    if (file) await fs.unlink(file.path).catch(() => {});
    return res.status(status).json({ message });
  };

  try {
    if (!file) return fail(400, "Please upload your payment screenshot");

    const parsed = bodySchema.safeParse({
      ...req.body,
      reference: String(req.body.reference || "").trim().toUpperCase(),
      transactionId: String(req.body.transactionId || "").trim().toUpperCase(),
    });
    if (!parsed.success) return fail(400, parsed.error.issues[0].message);
    const { planId, methodId, reference, transactionId } = parsed.data;

    // const plan = getPlan(planId);
    const plan = await getPlan(planId);
    const method = await getMethod(methodId);

    // if (!plan) return fail(400, "Selected plan was not found");
    if (!plan || !plan.active) return fail(400, "Selected plan is not available");
    if (!method) return fail(400, "Selected payment method is not available");
    if (!(await isRealImage(file.path))) return fail(400, "The uploaded file is not a valid image");

    const pending = await deposits.where("uid", "==", req.user.uid).where("status", "==", "pending").get();
    if (pending.size >= 3) return fail(400, "You already have 3 payments awaiting verification");

    // doc id = method + transaction id, so the same transaction can never be submitted twice
    const ref = deposits.doc(`${method.id}_${transactionId}`);

const record = {
  uid: req.user.uid,
  email: req.user.email || "",
  planId: plan.id,
  planName: plan.name,
  amount: plan.price,
  planSnapshot: { dailyProfit: plan.dailyProfit, durationDays: plan.durationDays, totalProfit: plan.totalProfit },
  methodId: method.id,
  methodName: method.name,
  accountName: method.accountName,
accountNumber: method.accountNumber,
  reference,
  transactionId,
  receiptFile: file.filename,
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
  
};
try {
  await ref.create(record);

} catch (e) {
  if (e.code !== 6) throw e;
  const old = await ref.get();
  // only the same user may resubmit, and only after a rejection
  if (old.exists && old.data().status === "rejected" && old.data().uid === req.user.uid) {
    await ref.set(record);
    await fs.unlink(path.join(RECEIPT_DIR, path.basename(old.data().receiptFile || ""))).catch(() => {});
  } else {
    return fail(409, "This transaction ID has already been submitted");
    return fail(409, "This transaction ID has already been submitted");
  }
}

    res.status(201).json({ deposit: { id: ref.id, status: "pending" } });
  } catch (err) {
    if (file) await fs.unlink(file.path).catch(() => {});
    next(err);
  }
};

export const listMyDeposits = async (req, res, next) => {
  try {
    const snap = await deposits.where("uid", "==", req.user.uid).limit(100).get();
    const list = snap.docs
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          planName: x.planName,
          amount: x.amount,
          methodName: x.methodName,
          transactionId: x.transactionId,
          status: x.status,
          reason: x.reason || "",
          createdAt: x.createdAt?.toDate?.().toISOString() || null,
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ deposits: list });
  } catch (err) {
    next(err);
  }
};

