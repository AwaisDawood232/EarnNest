import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db, auth } from "../config/firebase.js";
import { AVATAR_DIR } from "../middleware/avatar.middleware.js";
import { isRealImage } from "../utils/image.js";
import { avatarUrlOf } from "../utils/avatar.js";

const users = db.collection("users");

const updateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(60),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number"),
  country: z.string().trim().min(1, "Select a country").max(60),
});

const shape = (u) => ({
  fullName: u.fullName || "",
  email: u.email || "",
  phone: u.phone || "",
  country: u.country || "",
  role: u.role || "user",
  status: u.status || "active",
  referralCode: u.referralCode || "",
  createdAt: u.createdAt?.toDate?.().toISOString() || null,
  avatarUrl: avatarUrlOf(u),
  hasCustomAvatar: !!u.avatar,
});

const removeFile = (name) =>
  name ? fs.unlink(path.join(AVATAR_DIR, path.basename(name))).catch(() => {}) : null;

export const getProfile = async (req, res, next) => {
  try {
    const snap = await users.doc(req.user.uid).get();
    if (!snap.exists) return res.status(404).json({ message: "User not found" });
    res.json({ profile: shape(snap.data()) });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

    const ref = users.doc(req.user.uid);
    if (!(await ref.get()).exists) return res.status(404).json({ message: "User not found" });

    await ref.update({ ...parsed.data, updatedAt: new Date() });
    await auth.updateUser(req.user.uid, { displayName: parsed.data.fullName });

    res.json({ profile: shape((await ref.get()).data()) });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req, res, next) => {
  const file = req.file;
  const cleanup = () => (file ? fs.unlink(file.path).catch(() => {}) : null);
  try {
    if (!file) return res.status(400).json({ message: "Please choose an image" });
    if (!(await isRealImage(file.path))) {
      await cleanup();
      return res.status(400).json({ message: "The uploaded file is not a valid image" });
    }

    const ref = users.doc(req.user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await cleanup();
      return res.status(404).json({ message: "User not found" });
    }

    const old = snap.data().avatar;
    await ref.update({ avatar: file.filename, updatedAt: new Date() });
    await removeFile(old);

    res.json({ avatarUrl: `/uploads/avatars/${file.filename}`, hasCustomAvatar: true });
  } catch (err) {
    await cleanup();
    next(err);
  }
};

export const removeAvatar = async (req, res, next) => {
  try {
    const ref = users.doc(req.user.uid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: "User not found" });

    const data = snap.data();
    await ref.update({ avatar: FieldValue.delete(), updatedAt: new Date() });
    await removeFile(data.avatar);

    res.json({ avatarUrl: avatarUrlOf({ ...data, avatar: null }), hasCustomAvatar: false });
  } catch (err) {
    next(err);
  }
};