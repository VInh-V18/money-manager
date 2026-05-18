import multer from "multer";
import path from "path";
import fs from "fs";
import env from "../config/env.js";

const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Whitelist of allowed MIME types for images + canonical extension
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Derive extension from MIME type — never trust the original filename extension
    const ext = ALLOWED_IMAGE_TYPES[file.mimetype] || ".jpg";
    // Sanitize original name: strip non-alphanumeric, truncate
    const baseName = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30) || "upload";
    cb(null, `${Date.now()}_${baseName}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
    return cb(new Error("Chỉ cho phép upload ảnh (JPEG, PNG, GIF, WebP)"), false);
  }
  cb(null, true);
};

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1, // one file per request
  },
});

export const uploadJson = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isJson = file.mimetype === "application/json" || /\.json$/i.test(file.originalname);
    if (!isJson) return cb(new Error("Chỉ cho phép upload file JSON"), false);
    cb(null, true);
  },
  limits: { fileSize: Math.min(env.MAX_FILE_SIZE, 2 * 1024 * 1024), files: 1 },
});

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/csv" ||
      /\.csv$/i.test(file.originalname);
    if (!isCsv) return cb(new Error("Chỉ cho phép upload file CSV"), false);
    cb(null, true);
  },
  limits: { fileSize: Math.min(env.MAX_FILE_SIZE, 5 * 1024 * 1024), files: 1 },
});
