import { db } from "../config/firebase.js";

const ref = db.collection("settings").doc("community");

export const DEFAULTS = {
  adminNumber: "",
  adminMessage: "Hello, I need help with my account.",
  channelUrl: "",
  groupUrl: "",
};

export async function getCommunityRaw() {
  const s = await ref.get();
  return { ...DEFAULTS, ...(s.exists ? s.data() : {}) };
}

// What members receive: ready-to-open links (empty ones are null)
export async function getCommunity() {
  const c = await getCommunityRaw();
  return {
    admin: c.adminNumber
      ? `https://wa.me/${c.adminNumber}${c.adminMessage ? `?text=${encodeURIComponent(c.adminMessage)}` : ""}`
      : null,
    channel: c.channelUrl || null,
    group: c.groupUrl || null,
  };
}

export const saveCommunity = (data, uid) =>
  ref.set({ ...data, updatedAt: new Date(), updatedBy: uid }, { merge: true });


