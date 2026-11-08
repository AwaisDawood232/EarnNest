import { z } from "zod";
import { db } from "../config/firebase.js";
import { shapeCode, getPromoSettings } from "../services/promo.service.js";

const col = db.collection("promoCodes");
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[A-Z0-9]{3,20}$/.test(String(id));

const body = z.object({
  title: z.string().trim().min(3, "Title is too short").max(50, "Title is too long"),
  description: z.string().trim().max(120, "Description is too long"),
  type: z.enum(["percent", "fixed"], { message: "Choose a bonus type" }),
  value: z.coerce.number({ message: "Enter the bonus value" }).positive("Bonus must be greater than 0").max(1e9, "Bonus is too large"),
  maxBonus: z.coerce.number({ message: "Enter a maximum bonus (0 for no limit)" }).min(0, "Maximum bonus cannot be negative").max(1e9),
  applies: z.enum(["first", "repeat", "any"], { message: "Choose when the code applies" }),
  minDeposit: z.coerce.number({ message: "Enter a minimum deposit (0 for none)" }).min(0, "Minimum deposit cannot be negative").max(1e9),
  maxUses: z.coerce.number({ message: "Enter the usage limit (0 for unlimited)" }).int("Usage limit must be a whole number").min(0).max(1e9),
  expiresAt: z.coerce.date({ message: "Enter a valid expiry date" }).nullable(),
  public: z.boolean(),
  active: z.boolean(),
});

const createSchema = body.extend({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => /^[A-Z0-9]{3,20}$/.test(s), "Code must be 3 to 20 letters or numbers (no spaces)"),
});

const check = (d) => {
  if (d.type === "percent" && d.value > 100) throw httpError(400, "A percentage bonus cannot exceed 100%");
};

export const list = async (req, res, next) => {
  try {
    const [snap, claims, settings] = await Promise.all([
      col.limit(300).get(),
      db.collection("promoClaims").limit(2000).get(),
      getPromoSettings(),
    ]);
    const codes = snap.docs
      .map((d) => ({ ...shapeCode(d.id, d.data()), createdAt: d.data().createdAt?.toDate?.().toISOString() || null }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    res.json({
      codes,
      settings,
      stats: {
        codes: codes.length,
        claims: claims.size,
        paid: Math.round(claims.docs.reduce((a, d) => a + Number(d.data().bonus || 0), 0) * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    check(p.data);
    const { code, ...data } = p.data;
    try {
      await col.doc(code).create({ ...data, usedCount: 0, createdAt: new Date(), updatedAt: new Date(), createdBy: req.user.uid });
    } catch (e) {
      if (e.code === 6) throw httpError(409, "A promo code with this name already exists");
      throw e;
    }
    res.status(201).json({ code });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Promo code not found");
    const p = body.partial().safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Promo code not found");
    check({ ...shapeCode(id, snap.data()), ...p.data });
    await ref.update({ ...p.data, updatedAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Promo code not found");
    const ref = col.doc(id);
    if (!(await ref.get()).exists) throw httpError(404, "Promo code not found");
    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

const settingsSchema = z.object({
  claimWindowDays: z.coerce.number({ message: "Enter the number of days" }).int("Must be a whole number").min(1, "At least 1 day").max(30, "At most 30 days"),
});

export const saveSettings = async (req, res, next) => {
  try {
    const p = settingsSchema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    await db.collection("settings").doc("promo").set({ ...p.data, updatedAt: new Date(), updatedBy: req.user.uid }, { merge: true });
    res.json({ settings: await getPromoSettings() });
  } catch (err) {
    next(err);
  }
};

