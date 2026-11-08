import "dotenv/config";
import { db } from "../config/firebase.js";

const col = db.collection("paymentMethods");
let seeded = false;

// First run only: copies the accounts from .env into the database
const SEED = [
  ["easypaisa", "EasyPaisa", "EASYPAISA"],
  ["nayapay", "NayaPay", "NAYAPAY"],
  ["jazzcash", "JazzCash", "JAZZCASH"],
];

async function ensureSeeded() {
  if (seeded) return;
  const flag = db.collection("settings").doc("paymentMethods");
  if (!(await flag.get()).exists) {
    const batch = db.batch();
    SEED.forEach(([id, name, key], i) => {
      const accountName = process.env[`${key}_NAME`];
      const accountNumber = process.env[`${key}_NUMBER`];
      if (!accountName || !accountNumber) return;
      batch.set(col.doc(id), {
        name, kind: "wallet", accountName, accountNumber, instructions: "",
        logo: `/payments/${id}.png`, logoFile: "", sort: i, active: true,
        createdAt: new Date(), updatedAt: new Date(),
      });
    });
    batch.set(flag, { seededAt: new Date() });
    await batch.commit();
  }
  seeded = true;
}

export const shapeMethod = (id, d) => ({
  id,
  name: d.name || "Account",
  kind: d.kind === "bank" ? "bank" : "wallet",
  accountName: d.accountName || "",
  accountNumber: d.accountNumber || "",
  instructions: d.instructions || "",
  logo: d.logoFile ? `/uploads/methods/${d.logoFile}` : d.logo || "",
  logoFile: d.logoFile || "",
  sort: Number(d.sort || 0),
  active: d.active !== false,
});

export async function listAllMethods() {
  await ensureSeeded();
  const snap = await col.get();
  return snap.docs.map((d) => shapeMethod(d.id, d.data())).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

// What members see: visible accounts that have all their details
export const getMethods = async () =>
  (await listAllMethods()).filter((m) => m.active && m.accountName && m.accountNumber);

export async function getMethod(id) {
  if (!/^[a-z0-9-]{1,40}$/.test(String(id))) return null;
  await ensureSeeded();
  const snap = await col.doc(id).get();
  if (!snap.exists) return null;
  const m = shapeMethod(snap.id, snap.data());
  return m.active && m.accountName && m.accountNumber ? m : null;
}
