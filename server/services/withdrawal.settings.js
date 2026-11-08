import { db } from "../config/firebase.js";

const ref = db.collection("settings").doc("withdrawals");

// Starting values. The admin changes them from the website afterwards.
export const METHOD_DEFAULTS = {
  easypaisa: { name: "EasyPaisa", min: 500, max: 100000, feePercent: 0, enabled: true },
  jazzcash:  { name: "JazzCash",  min: 500, max: 100000, feePercent: 0, enabled: true },
  nayapay:   { name: "NayaPay",   min: 500, max: 100000, feePercent: 0, enabled: true },
};

export async function getSettings() {
  const snap = await ref.get();
  const d = snap.exists ? snap.data() : {};
  const methods = Object.fromEntries(
    Object.entries(METHOD_DEFAULTS).map(([id, def]) => [id, { ...def, ...(d.methods?.[id] || {}), name: def.name }])
  );
  return { requirePlan: d.requirePlan ?? true, maxPending: d.maxPending ?? 2, methods };
}

export const saveSettings = (s, uid) =>
  ref.set({ ...s, updatedAt: new Date(), updatedBy: uid }, { merge: true });

