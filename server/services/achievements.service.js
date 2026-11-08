import { db } from "../config/firebase.js";
import { SEED_ACHIEVEMENTS } from "../config/achievements.config.js";

const col = db.collection("achievements");
const num = (v) => Number(v || 0);
let seeded = false;

export const DEFAULT_SETTINGS = {
  checkinEnabled: true,
  checkinReward: 5,
  streakDays: 7,
  streakBonus: 50,
  requirePlan: true,
};

export const shapeAch = (id, d) => ({
  id,
  level: num(d.level),
  name: d.name || "Achievement",
  icon: d.icon || "🏅",
  ownTarget: num(d.ownTarget),
  teamTarget: num(d.teamTarget),
  reward: num(d.reward),
  active: d.active !== false,
});

async function ensureSeeded() {
  if (seeded) return;
  const flag = db.collection("settings").doc("achievements");
  if (!(await flag.get()).exists) {
    const batch = db.batch();
    SEED_ACHIEVEMENTS.forEach(([level, name, icon, ownTarget, teamTarget, reward]) =>
      batch.set(col.doc(`level-${level}`), {
        level, name, icon, ownTarget, teamTarget, reward,
        active: true, createdAt: new Date(), updatedAt: new Date(),
      })
    );
    batch.set(flag, { seededAt: new Date() });
    await batch.commit();
  }
  seeded = true;
}

export async function listAchievements({ activeOnly = true } = {}) {
  await ensureSeeded();
  const snap = await col.get();
  return snap.docs
    .map((d) => shapeAch(d.id, d.data()))
    .filter((a) => !activeOnly || a.active)
    .sort((a, b) => a.level - b.level);
}

export async function getEngagementSettings() {
  const s = await db.collection("settings").doc("engagement").get();
  return { ...DEFAULT_SETTINGS, ...(s.exists ? s.data() : {}) };
}

// Used by the Dashboard "Next Achievement" card
export async function getNextAchievement(u) {
  const list = await listAchievements();
  const claimed = u.claimedAchievements || [];
  const own = num(u.stats?.ownInvestment);
  const team = num(u.stats?.teamInvestment);
  const next = list.find((a) => !claimed.includes(a.id));
  if (!next) {
    return {
      title: "All levels completed", reward: 0,
      own: { current: own, target: own || 1 }, team: { current: team, target: team || 1 },
    };
  }
  return {
    title: next.name, reward: next.reward,
    own: { current: own, target: next.ownTarget }, team: { current: team, target: next.teamTarget },
  };
}

// Used by the Dashboard announcement banner
export async function latestPost() {
  const snap = await db.collection("posts").where("active", "==", true).limit(30).get();
  const items = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) ||
      (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  const p = items[0];
  return p ? { id: p.id, title: p.title, body: String(p.body || "").slice(0, 160), kind: p.kind } : null;
}


