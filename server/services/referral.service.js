import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
// import { COMMISSION_RATES } from "../config/referral.config.js";

const round2 = (n) => Math.round(n * 100) / 100;


export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

/**
 * Pays commissions up the buyer's upline chain.
 * type "plan" = buyer purchased a plan (amount = plan price)
 * type "ads"  = buyer earned from ads  (amount = ad earnings)
 * Runs in ONE Firestore transaction, so it is all-or-nothing.
 * Call this only from server code, never from a client request.
 */
export async function creditReferralCommissions({ buyerUid, amount, type }) {
  // const rates = COMMISSION_RATES[type];
  if (!rates) throw new Error("Unknown commission type");
  if (!(amount > 0)) throw new Error("Amount must be positive");

  return db.runTransaction(async (t) => {
    // ---- all reads first ----
    const buyerRef = db.collection("users").doc(buyerUid);
    const buyer = await t.get(buyerRef);
    if (!buyer.exists) throw new Error("Buyer not found");

    const uplineIds = (buyer.data().uplines || []).slice(0, rates.length);
    const upRefs = uplineIds.map((id) => db.collection("users").doc(id));
    const upSnaps = upRefs.length ? await t.getAll(...upRefs) : [];

    // ---- then writes ----
    const today = dayKey();
    const credited = [];

    upSnaps.forEach((snap, i) => {
      if (!snap.exists) return;
      const upRef = upRefs[i];
      const commission = round2((amount * rates[i]) / 100);

      // team activity for the "Today/Yesterday/Monthly" tiles
      t.set(
        db.collection("referralDaily").doc(`${upRef.id}_${today}`),
        { uid: upRef.id, date: today, [type === "plan" ? "invest" : "ads"]: FieldValue.increment(amount) },
        { merge: true }
      );

      if (commission > 0) {
        t.update(upRef, {
          "wallets.referral": FieldValue.increment(commission),
          "stats.totalEarnings": FieldValue.increment(commission),
          [i === 0 ? "referralStats.directCommission" : "referralStats.indirectCommission"]:
            FieldValue.increment(commission),
          updatedAt: new Date(),
        });
        t.set(db.collection("transactions").doc(), {
          uid: upRef.id,
          type: "referral_commission",
          source: type,
          level: i + 1,
          amount: commission,
          fromUid: buyerUid,
          status: "completed",
          createdAt: new Date(),
        });
        credited.push({ uid: upRef.id, level: i + 1, commission });
      }
    });

    if (type === "plan") t.update(buyerRef, { hasPlan: true, updatedAt: new Date() });
    return { credited };
  });
}