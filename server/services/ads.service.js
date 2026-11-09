import { db } from "../config/firebase.js";
import { dayKey } from "./referral.service.js";

const num = (v) => Number(v || 0);

export const DEFAULTS = { enabled: true, requirePlan: true, limitWithPlan: 10, limitNoPlan: 3, cooldownSec: 5 };

export async function getAdSettings() {
  const s = await db.collection("settings").doc("ads").get();
  return { ...DEFAULTS, ...(s.exists ? s.data() : {}) };
}

export const shapeAd = (id, d) => ({
  id,
  title: d.title || "Ad",
  description: d.description || "",
  type: ["youtube", "video", "upload", "link"].includes(d.type) ? d.type : "video",
  videoId: d.videoId || "",
  url: d.url || "",
  file: d.file || "",
  requiredSec: num(d.requiredSec),
  reward: num(d.reward),
  active: d.active !== false,
  sort: num(d.sort),
  views: num(d.views),
  paid: num(d.paid),
});

export const srcOf = (a) => (a.type === "upload" ? `/uploads/ads/${a.file}` : a.type === "video" || a.type === "link" ? a.url : "");
export const thumbOf = (a) => (a.type === "youtube" ? `https://img.youtube.com/vi/${a.videoId}/hqdefault.jpg` : "");

export const hasActivePlan = async (uid) =>
  (await db.collection("userPlans").where("uid", "==", uid).where("status", "==", "active").count().get()).data().count > 0;

export const gate = (u, s, hasPlan) =>
  !s.enabled ? "Watch Ads is temporarily unavailable."
  : u.status === "suspended" ? "Your account is suspended."
  : s.requirePlan && !hasPlan ? "Purchase a plan to start watching ads and earning money."
  : null;

export const limitOf = (s, hasPlan) => (hasPlan ? s.limitWithPlan : s.limitNoPlan);

export function todayStats(u) {
  const a = u.adStats || {};
  const same = a.day === dayKey();
  return {
    count: same ? num(a.count) : 0,
    seconds: same ? num(a.seconds) : 0,
    earned: same ? num(a.earned) : 0,
    lastAt: a.lastAt?.toDate?.().getTime() || 0,
  };
}

export const cooldownLeft = (u, s) =>
  Math.max(Math.ceil((todayStats(u).lastAt + s.cooldownSec * 1000 - Date.now()) / 1000), 0);

