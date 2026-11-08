import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const METHOD_DIR = path.resolve("uploads/methods");
fs.mkdirSync(METHOD_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: METHOD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only PNG, JPG or WEBP images are allowed")),
}).single("logo");

export const methodLogoUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Logo must be under 1 MB" : err.message });
  });


  