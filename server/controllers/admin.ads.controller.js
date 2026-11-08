import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { z } from "zod";
import { db } from "../config/firebase.js";
import { ADS_DIR } from "../middleware/adupload.middleware.js";
import { isRealVideo } from "../utils/video.js";
import { dayKey } from "../services/referral.service.js";
import { DEFAULTS, getAdSettings, shapeAd, srcOf, thumbOf } from "../services/ads.service.js";

const col = db.collection("ads");
const views = db.collection("adViews");
const num = (v) => Number(v || 0);
const round2 = (n) => Math.round(n * 100) / 100;
const iso = (ts) => ts?.toDate?.().toISOString() || null;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[A-Za-z0-9]{10,40}$/.test(String(id));
const dropFile = (name) => (name ? fs.unlink(path.join(ADS_DIR, path.basename(name))).catch(() => {}) : null);

/* ---------- link helpers ---------- */
function youtubeId(input) {
  const s = String(input || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else id = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/)?.[2];
    }
    return /^[\w-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}

function resolveSource(type, source) {
  if (type === "youtube") {
    const id = youtubeId(source);
    if (!id) throw httpError(400, "Enter a valid YouTube link");
    return { videoId: id, url: "", file: "" };
  }
  if (type === "video") {
    let u = null;
    try { u = new URL(String(source).trim()); } catch {}
    if (!u || u.protocol !== "https:") throw httpError(400, "Enter a valid https video link (.mp4 or .webm)");
    return { videoId: "", url: u.href, file: "" };
  }
  if (!/^[\w-]+\.(mp4|webm)$/.test(source) || !existsSync(path.join(ADS_DIR, source))) {
    throw httpError(400, "Upload a video file first");
  }
  return { videoId: "", url: "", file: source };
}

const base = z.object({
  title: z.string().trim().min(3, "Title is too short").max(80, "Title is too long"),
  description: z.string().trim().max(200, "Description is too long"),
  type: z.enum(["youtube", "video", "upload"], { message: "Choose a video source" }),
  source: z.string().trim().min(1, "Add the video link or upload a video").max(500),
  requiredSec: z.coerce.number({ message: "Enter the watch time" }).int("Watch time must be a whole number").min(5, "Minimum watch time is 5 seconds").max(3600, "Maximum watch time is 3600 seconds"),
  reward: z.coerce.number({ message: "Enter the reward" }).positive("Reward must be greater than 0").max(1_000_000, "Reward is too large"),
  sort: z.coerce.number().int().min(0).max(9999),
  active: z.boolean(),
});

/* ---------- list ---------- */
export const list = async (req, res, next) => {
  try {
    const [adSnap, todaySnap, settings] = await Promise.all([
      col.limit(200).get(),
      views.where("day", "==", dayKey()).limit(3000).get(),
      getAdSettings(),
    ]);

    const ads = adSnap.docs
      .map((d) => {
        const a = shapeAd(d.id, d.data());
        return { ...a, src: srcOf(a), thumb: thumbOf(a) };
      })
      .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));

    const done = todaySnap.docs.map((d) => d.data()).filter((v) => v.status === "completed");
    res.json({
      ads,
      settings,
      stats: {
        watchersToday: new Set(done.map((v) => v.uid)).size,
        watchedToday: done.length,
        paidToday: round2(done.reduce((a, v) => a + num(v.reward), 0)),
        secondsToday: done.reduce((a, v) => a + num(v.watchedSec), 0),
        totalViews: ads.reduce((a, x) => a + x.views, 0),
        totalPaid: round2(ads.reduce((a, x) => a + x.paid, 0)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ---------- who watched what ---------- */
export const activity = async (req, res, next) => {
  try {
    const snap = await views.orderBy("updatedAt", "desc").limit(300).get();
    res.json({
      items: snap.docs.map((d) => {
        const v = d.data();
        return {
          id: d.id, name: v.name || "Member", email: v.email || "", adTitle: v.adTitle || "Ad",
          status: v.status, requiredSec: num(v.requiredSec), watchedSec: num(v.watchedSec),
          reward: num(v.reward), attempts: num(v.attempts),
          startedAt: iso(v.startedAt), completedAt: iso(v.completedAt),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};

/* ---------- create / update / delete ---------- */
export const create = async (req, res, next) => {
  try {
    const p = base.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    const { source, ...rest } = p.data;
    const extra = resolveSource(rest.type, source);
    const ref = col.doc();
    await ref.set({ ...rest, ...extra, views: 0, paid: 0, createdAt: new Date(), updatedAt: new Date(), createdBy: req.user.uid });
    res.status(201).json({ id: ref.id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Ad not found");
    const p = base.partial().safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);

    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Ad not found");
    const cur = snap.data();

    const { source, ...rest } = p.data;
    let extra = {};
    if (rest.type !== undefined || source !== undefined) {
      const type = rest.type ?? cur.type;
      const src = source ?? (cur.type === "youtube" ? cur.videoId : cur.type === "upload" ? cur.file : cur.url);
      extra = resolveSource(type, src);
    }

    await ref.update({ ...rest, ...extra, updatedAt: new Date() });
    if (extra.file !== undefined && cur.file && cur.file !== extra.file) await dropFile(cur.file);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Ad not found");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Ad not found");
    await ref.delete();
    await dropFile(snap.data().file);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/* ---------- video upload ---------- */
export const uploadVideo = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) throw httpError(400, "Choose a video file");
    if (!(await isRealVideo(file.path))) {
      await dropFile(file.filename);
      throw httpError(400, "The uploaded file is not a valid MP4 or WEBM video");
    }
    res.json({ file: file.filename, url: `/uploads/ads/${file.filename}` });
  } catch (err) {
    next(err);
  }
};

/* ---------- settings ---------- */
const settingsSchema = z.object({
  enabled: z.boolean(),
  requirePlan: z.boolean(),
  limitWithPlan: z.coerce.number({ message: "Enter the daily limit" }).int("Limit must be a whole number").min(1, "At least 1 ad").max(200, "At most 200 ads"),
  limitNoPlan: z.coerce.number({ message: "Enter the limit for members without a plan" }).int("Limit must be a whole number").min(0, "Cannot be negative").max(200, "At most 200 ads"),
  cooldownSec: z.coerce.number({ message: "Enter the wait time" }).int("Must be a whole number").min(0, "Cannot be negative").max(600, "At most 600 seconds"),
});

export const saveSettings = async (req, res, next) => {
  try {
    const p = settingsSchema.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    await db.collection("settings").doc("ads").set({ ...DEFAULTS, ...p.data, updatedAt: new Date(), updatedBy: req.user.uid }, { merge: true });
    res.json({ settings: await getAdSettings() });
  } catch (err) {
    next(err);
  }
};

