import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";
import { z } from "zod";
import { db } from "../config/firebase.js";
import { METHOD_DIR } from "../middleware/methodlogo.middleware.js";
import { isRealImage } from "../utils/image.js";
import { listAllMethods } from "../services/payment.service.js";

const col = db.collection("paymentMethods");
const httpError = (status, message) => Object.assign(new Error(message), { status });
const validId = (id) => /^[a-z0-9-]{1,40}$/.test(String(id));
const dropFile = (name) => (name ? fs.unlink(path.join(METHOD_DIR, path.basename(name))).catch(() => {}) : null);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "account";

const base = z.object({
  name: z.string().trim().min(2, "Method name is too short").max(30, "Method name is too long"),
  kind: z.enum(["wallet", "bank"], { message: "Choose the account type" }),
  accountName: z.string().trim().min(3, "Enter the account holder name").max(60, "Account name is too long"),
  accountNumber: z.string().trim().regex(/^[A-Za-z0-9 -]{5,34}$/, "Account number: 5 to 34 letters, numbers, spaces or dashes"),
  instructions: z.string().trim().max(300, "Instructions are too long (300 characters max)"),
  sort: z.coerce.number().int("Order must be a whole number").min(0).max(999),
  active: z.boolean(),
  logoFile: z.string().regex(/^[\w-]+\.(png|jpg|webp)$/, "Invalid logo").optional(),
  removeLogo: z.boolean().optional(),
});

const checkLogo = (name) => {
  if (name && !existsSync(path.join(METHOD_DIR, path.basename(name)))) throw httpError(400, "Upload the logo again");
};

export const list = async (req, res, next) => {
  try {
    res.json({ methods: await listAllMethods() });
  } catch (err) {
    next(err);
  }
};

export const uploadLogo = async (req, res, next) => {
  const file = req.file;
  try {
    if (!file) throw httpError(400, "Choose a logo image");
    if (!(await isRealImage(file.path))) {
      await dropFile(file.filename);
      throw httpError(400, "The uploaded file is not a valid image");
    }
    res.json({ file: file.filename });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const p = base.safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);
    const { logoFile, removeLogo, ...rest } = p.data;
    checkLogo(logoFile);

    const id = `${slug(rest.name)}-${crypto.randomBytes(2).toString("hex")}`;
    await col.doc(id).set({ ...rest, logoFile: logoFile || "", logo: "", createdAt: new Date(), updatedAt: new Date(), createdBy: req.user.uid });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Account not found");
    const p = base.partial().safeParse(req.body);
    if (!p.success) throw httpError(400, p.error.issues[0].message);

    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Account not found");
    const cur = snap.data();

    const { logoFile, removeLogo, ...rest } = p.data;
    const patch = { ...rest };
    if (logoFile) {
      checkLogo(logoFile);
      patch.logoFile = logoFile;
      patch.logo = "";
    } else if (removeLogo) {
      patch.logoFile = "";
      patch.logo = "";
    }

    await ref.update({ ...patch, updatedAt: new Date() });
    if (patch.logoFile !== undefined && cur.logoFile && cur.logoFile !== patch.logoFile) await dropFile(cur.logoFile);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validId(id)) throw httpError(404, "Account not found");
    const ref = col.doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw httpError(404, "Account not found");

    const pending = await db.collection("deposits").where("methodId", "==", id).where("status", "==", "pending").limit(1).get();
    if (!pending.empty) throw httpError(409, "This account has payments waiting for review. Review them first, or hide the account instead.");

    await ref.delete();
    await dropFile(snap.data().logoFile);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};


