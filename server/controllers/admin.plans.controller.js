import crypto from "crypto";
import { z } from "zod";
import { db } from "../config/firebase.js";
import { listAllPlans, withTotals } from "../services/plans.service.js";

const col = db.collection("plans");
const money2 = (n) => Math.round(n * 100) / 100;

const base = z.object({
  name: z.string().trim().min(2, "Plan name is too short").max(40, "Plan name is too long"),
  price: z.coerce.number().positive("Price must be greater than 0").max(10_000_000, "Price is too high").transform(money2),
  dailyProfit: z.coerce.number().positive("Daily profit must be greater than 0").max(10_000_000, "Daily profit is too high").transform(money2),
  durationDays: z.coerce.number().int("Days must be a whole number").min(1, "Minimum 1 day").max(3650, "Maximum 3650 days"),
  popular: z.boolean().optional(),
  active: z.boolean().optional(),
});
const createSchema = base;
const updateSchema = base.partial();

const validId = (id) => /^[a-z0-9-]{1,60}$/.test(String(id));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "plan";

// only one plan can wear the "Popular" badge
async function save(id, data, isNew, uid) {
  const batch = db.batch();
  if (data.popular) {
    const others = await col.where("popular", "==", true).get();
    others.docs.forEach((d) => d.id !== id && batch.update(d.ref, { popular: false }));
  }
  const ref = col.doc(id);
  if (isNew) batch.set(ref, { ...data, createdAt: new Date(), updatedAt: new Date(), updatedBy: uid });
  else batch.update(ref, { ...data, updatedAt: new Date(), updatedBy: uid });
  await batch.commit();
}

export const list = async (req, res, next) => {
  try {
    res.json({ plans: await listAllPlans() });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ message: p.error.issues[0].message });

    const id = `${slug(p.data.name)}-${crypto.randomBytes(2).toString("hex")}`;
    await save(id, { ...p.data, popular: !!p.data.popular, active: p.data.active !== false }, true, req.user.uid);
    res.status(201).json({ plan: withTotals(id, (await col.doc(id).get()).data()) });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const p = updateSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ message: p.error.issues[0].message });
    if (!validId(id) || !(await col.doc(id).get()).exists) return res.status(404).json({ message: "Plan not found" });

    await save(id, p.data, false, req.user.uid);
    res.json({ plan: withTotals(id, (await col.doc(id).get()).data()) });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id) || !(await col.doc(id).get()).exists) return res.status(404).json({ message: "Plan not found" });

    const [dep, owned] = await Promise.all([
      db.collection("deposits").where("planId", "==", id).limit(1).get(),
      db.collection("userPlans").where("planId", "==", id).limit(1).get(),
    ]);
    if (!dep.empty || !owned.empty) {
      return res.status(409).json({ message: "This plan has purchases, so it can't be deleted. Hide it instead." });
    }
    await col.doc(id).delete();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
