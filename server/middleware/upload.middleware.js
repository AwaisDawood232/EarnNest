import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const RECEIPT_DIR = path.resolve("uploads/receipts");
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: RECEIPT_DIR,
    // never trust the original filename
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only JPG, PNG or WEBP images are allowed")),
}).single("screenshot");

export const receiptUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Screenshot must be under 4 MB" : err.message;
    res.status(400).json({ message });
  });

  