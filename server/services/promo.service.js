import { db } from "../config/firebase.js";

const num = (v) => Number(v || 0);

export async function getPromoSettings() {
  const s = await db.collection("settings").doc("promo").get();
  const d = s.exists ? s.data() : {};
  return { claimWindowDays: Math.min(Math.max(num(d.claimWindowDays) || 3, 1), 30) };
}

export const shapeCode = (id, d) => ({
  id,
  code: id,
  title: d.title || id,
  description: d.description || "",
  type: d.type === "fixed" ? "fixed" : "percent",
  value: num(d.value),
  maxBonus: num(d.maxBonus),
  applies: ["first", "repeat", "any"].includes(d.applies) ? d.applies : "any",
  minDeposit: num(d.minDeposit),
  maxUses: num(d.maxUses),
  usedCount: num(d.usedCount),
  expiresAt: d.expiresAt?.toDate?.().toISOString() || null,
  public: !!d.public,
  active: d.active !== false,
});

export const isExpired = (c) => !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
export const isFull = (c) => c.maxUses > 0 && c.usedCount >= c.maxUses;

