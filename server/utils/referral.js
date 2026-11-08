import crypto from "crypto";
import { db } from "../config/firebase.js";

// No 0/O/1/I so codes are easy to read and type
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateReferralCode = (len = 8) =>
  Array.from(crypto.randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join("");

export async function createUniqueReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const q = await db.collection("users").where("referralCode", "==", code).limit(1).get();
    if (q.empty) return code;
  }
  throw new Error("Could not generate a unique referral code");
}