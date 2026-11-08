import { z } from "zod";
import { db } from "../config/firebase.js";
import { listAchievements, getEngagementSettings } from "../services/achievements.service.js";

const DAY = 864e5;
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const idOk = (id) => /^[A-Za-z0-9_-]{1,60}$/.test(String(id));
const ms = (v) => (v?.toDate ? v.toDate().getTime() : new Date(v).getTime());
const money = (label, { positive = false } = {}) =>
  z.coerce.number({ message: `Enter a valid ${label}` })
    [positive ? "positive" : "min"](positive ? 0 : 0, `${label} must be ${positive ? "greater than 0" : "0 or more"}`)
    .max(1e12, `${label} is too large`);

/* ---------- schemas (no defaults inside, so partial updates are safe) ---------- */
const achSchema = z.object({
  level: z.coerce.number({ message: "Enter a valid level" }).int("Level must be a whole number").min(1).max(999),
  name: z.string().trim().min(2, "Name is too short").max(40, "Name is too long"),
  icon: z.string().trim().min(1, "Add an emoji icon").max(8, "Icon is too long"),
  ownTarget: money("own investment target"),
  teamTarget: money("team investment target"),
  reward: money("reward", { positive: true }),
  active: z.boolean(),
});

const eventSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(60, "Title is too long"),
  description: z.string().trim().max(200, "Description is too long").optional(),
  icon: z.string().trim().min(1, "Add an emoji icon").max(8),
  kind: z.enum(["invest", "team"], { message: "Choose a goal type" }),
  target: money("target", { positive: true }),
  reward: money("reward", { positive: true }),
  startsAt: z.coerce.date({ message: "Enter a valid start time" }),
  endsAt: z.coerce.date({ message: "Enter a valid end time" }),
  active: z.boolean(),
});

const postSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80, "Title is too long"),
  body: z.string().trim().min(1, "Write the post text").max(1000, "Post is too long (1000 characters max)"),
  kind: z.enum(["news", "promo", "update"], { message: "Choose a post type" }),
  pinned: z.boolean(),
  active: z.boolean(),
});

const settingsSchema = z.object({
  checkinEnabled: z.boolean(),
  checkinReward: money("daily reward"),
  streakDays: z.coerce.number({ message: "Enter the streak length" }).int().min(2, "At least 2 days").max(30, "At most 30 days"),
  streakBonus: money("streak bonus"),
  requirePlan: z.boolean(),
});

const checkEvent = (e) => {
  if (!(ms(e.endsAt) > ms(e.startsAt))) throw httpError(400, "The end time must be after the start time");
  if (ms(e.endsAt) - ms(e.startsAt) > 62 * DAY) throw httpError(400, "An event can last at most 62 days");
};

/* ---------- generic create / update / delete ---------- */
function crud(name, schema, { defaults = {}, check } = {}) {
  const col = db.collection(name);
  return {
    create: async (req, res, next) => {
      try {
        const p = schema.safeParse(req.body);
        if (!p.success) throw httpError(400, p.error.issues[0].message);
        const data = { ...defaults, ...p.data };
        check?.(data);
        const ref = col.doc();
        await ref.set({ ...data, createdAt: new Date(), updatedAt: new Date(), createdBy: req.user.uid });
        res.status(201).json({ id: ref.id });
      } catch (err) { next(err); }
    },
    update: async (req, res, next) => {
      try {
        const { id } = req.params;
        if (!idOk(id)) throw httpError(404, "Not found");
        const p = schema.partial().safeParse(req.body);
        if (!p.success) throw httpError(400, p.error.issues[0].message);
        const ref = col.doc(id);
        const snap = await ref.get();
        if (!snap.exists) throw httpError(404, "Not found");
        check?.({ ...snap.data(), ...p.data });
        await ref.update({ ...p.data, updatedAt: new Date() });
        res.json({ ok: true });
      } catch (err) { next(err); }
    },
    remove: async (req, res, next) => {
      try {
        const { id } = req.params;
        if (!idOk(id)) throw httpError(404, "Not found");
        const ref = col.doc(id);
        if (!(await ref.get()).exists) throw httpError(404, "Not found");
        await ref.delete();
        res.json({ ok: true });
      } catch (err) { next(err); }
    },
  };
}

export const crudFor = {
  achievements: crud("achievements", achSchema),
  events: crud("events", eventSchema, { defaults: { description: "" }, check: checkEvent }),
  posts: crud("posts", postSchema),
};

/* ---------- everything for the admin page ---------- */
export const listEngagement = async (req, res, next) => {
  try {
    const [achievements, evSnap, postSnap, settings] = await Promise.all([
      listAchievements({ activeOnly: false }),
      db.collection("events").limit(200).get(),
      db.collection("posts").limit(200).get(),
      getEngagementSettings(),
    ]);

    const events = evSnap.docs
      .map((d) => {
        const e = d.data();
        return {
          id: d.id, title: e.title, description: e.description || "", icon: e.icon || "🎯",
          kind: e.kind, target: e.target, reward: e.reward,
          startsAt: iso(e.startsAt), endsAt: iso(e.endsAt), active: e.active !== false,
        };
      })
      .sort((a, b) => (b.startsAt || "").localeCompare(a.startsAt || ""));

    const posts = postSnap.docs
      .map((d) => {
        const p = d.data();
        return { id: d.id, title: p.title, body: p.body, kind: p.kind, pinned: !!p.pinned, active: p.active !== false, createdAt: iso(p.createdAt) };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    res.json({ achievements, events, posts, settings });
  } catch (err) { next(err); }
};

export const saveSettings = async (req, res, next) => {
  try {
    const p = settingsSchema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    await db.collection("settings").doc("engagement").set({ ...p.data, updatedAt: new Date(), updatedBy: req.user.uid }, { merge: true });
    res.json({ settings: await getEngagementSettings() });
  } catch (err) { next(err); }
};


