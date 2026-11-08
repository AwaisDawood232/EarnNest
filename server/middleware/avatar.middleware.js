import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const AVATAR_DIR = path.resolve("uploads/avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) =>
      cb(null, `${req.user.uid.slice(0, 8)}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG or WEBP images are allowed")),
}).single("avatar");

export const avatarUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Image is too large" : err.message });
  });

  