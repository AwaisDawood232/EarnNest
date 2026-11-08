import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const ADS_DIR = path.resolve("uploads/ads");
fs.mkdirSync(ADS_DIR, { recursive: true });

const EXT = { "video/mp4": ".mp4", "video/webm": ".webm" };

const upload = multer({
  storage: multer.diskStorage({
    destination: ADS_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 80 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error("Only MP4 or WEBM videos are allowed")),
}).single("video");

export const adVideoUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Video must be under 80 MB" : err.message });
  });

  