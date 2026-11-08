// import "dotenv/config";
// import { db, auth } from "../src/config/firebase.js";
// import { creditPlan } from "../src/services/reward.service.js";

// const [email, daysArg] = process.argv.slice(2);
// const days = Number(daysArg);
// if (!email || !(days > 0)) {
//   console.log("Usage: node scripts/skip-days.js <user-email> <days>");
//   process.exit(1);
// }

// const { uid } = await auth.getUserByEmail(email);
// const snap = await db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").get();
// if (snap.empty) console.log("No active plans for this user.");

// for (const d of snap.docs) {
//   const p = d.data();
//   await d.ref.update({
//     startedAt: new Date(p.startedAt.toDate().getTime() - days * 864e5),
//     endsAt: new Date(p.endsAt.toDate().getTime() - days * 864e5),
//   });
//   const paid = await creditPlan(d.id);
//   console.log(`${p.name}: paid Rs ${paid}`);
// }
// process.exit();

