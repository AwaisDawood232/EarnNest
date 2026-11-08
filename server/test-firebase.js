import "dotenv/config";
import { db } from "./src/config/firebase.js";

try {
  await db.collection("test").doc("ping").set({ ok: true, at: new Date() });
  console.log("SUCCESS: Firestore works");
} catch (e) {
  console.error("FAILED:", e.code, e.message);
}
process.exit();
