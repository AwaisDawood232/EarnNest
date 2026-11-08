import "dotenv/config";
import { db } from "../src/config/firebase.js";
import { approveDeposit } from "../src/services/deposit.service.js";

const [cmd, id, ...rest] = process.argv.slice(2);
const deposits = db.collection("deposits");

if (cmd === "list") {
  const snap = await deposits.where("status", "==", "pending").get();
  if (snap.empty) console.log("No pending payments.");
  snap.docs.forEach((d) => {
    const x = d.data();
    console.log(`\nID:       ${d.id}\nUser:     ${x.email}\nPlan:     ${x.planName} (Rs ${x.amount})\nMethod:   ${x.methodName}\nTxn ID:   ${x.transactionId}\nReceipt:  uploads/receipts/${x.receiptFile}`);
  });
} else if (cmd === "approve" && id) {
  const r = await approveDeposit(id);
  console.log(`Approved. ${r.planName} activated.`);
  console.log(r.bonuses.length ? "Referral bonuses paid: " + JSON.stringify(r.bonuses) : "No referral bonus (not a first purchase, or no referrer).");
} else if (cmd === "reject" && id) {
  await deposits.doc(id).update({ status: "rejected", reason: rest.join(" ") || "Payment could not be verified", updatedAt: new Date() });
  console.log("Rejected.");
} else {
  console.log("Usage:\n  node scripts/review-deposit.js list\n  node scripts/review-deposit.js approve <id>\n  node scripts/review-deposit.js reject <id> [reason]");
}
process.exit();