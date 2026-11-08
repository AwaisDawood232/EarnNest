import { db } from "../config/firebase.js";
import { SEED_PLANS, SEED_DURATION_DAYS } from "../config/plans.config.js";

const col = db.collection("plans");
const round1 = (n) => Math.round(n * 10) / 10;

// Adds the calculated fields (total earning + ROI)
export const withTotals = (id, d) => {
  const totalProfit = Math.round(d.dailyProfit * d.durationDays * 100) / 100;
  return {
    id,
    name: d.name,
    price: d.price,
    dailyProfit: d.dailyProfit,
    durationDays: d.durationDays,
    totalProfit,
    roi: round1(((totalProfit - d.price) / d.price) * 100),
    popular: !!d.popular,
    active: d.active !== false,
  };
};

// Fills the database with the starting plans, one time only
async function ensureSeeded() {
  const flag = db.collection("settings").doc("plans");
  if ((await flag.get()).exists) return;

  const batch = db.batch();
  SEED_PLANS.forEach(([id, name, price, dailyProfit]) =>
    batch.set(col.doc(id), {
      name, price, dailyProfit,
      durationDays: SEED_DURATION_DAYS,
      popular: id === "explorer",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
  batch.set(flag, { seededAt: new Date() });
  await batch.commit();
}

export async function listAllPlans() {
  await ensureSeeded();
  const snap = await col.get();
  return snap.docs.map((d) => withTotals(d.id, d.data())).sort((a, b) => a.price - b.price);
}

export const listActivePlans = async () => (await listAllPlans()).filter((p) => p.active);

export async function getPlan(id) {
  if (!/^[a-z0-9-]{1,60}$/.test(String(id))) return null;
  await ensureSeeded();
  const snap = await col.doc(id).get();
  return snap.exists ? withTotals(snap.id, snap.data()) : null;
}