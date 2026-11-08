// import admin from "firebase-admin";
// import { env } from "./env.js";

// console.log("Checking Firebase Config:", {
//   projectId: env.firebase.projectId,
//   clientEmail: env.firebase.clientEmail,
//   hasPrivateKey: !!env.firebase.privateKey,
// });

// admin.initializeApp({
//   credential: admin.credential.cert(env.firebase),
// });

// export const db = admin.firestore();
// export const auth = admin.auth();




import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { env } from "./env.js";


const app = initializeApp({
  credential: cert(env.firebase),
});

export const db = getFirestore(app);
export const auth = getAuth(app);

