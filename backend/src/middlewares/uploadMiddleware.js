import multer from "multer";
import path from "path";
import fs from "fs";
import env from "../config/env.js";

// dam bao thu muc upload ton tai
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// luu file len disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safe = file.originalname
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    cb(null, `${Date.now()}_${safe}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  if (!allowed.test(file.originalname)) {
    return cb(new Error("Chi cho phep upload anh"), false);
  }
  cb(null, true);
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE },
});

export const uploadJson = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!/\.json$/i.test(file.originalname) && file.mimetype !== "application/json") {
      return cb(new Error("Chi cho phep upload file JSON"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: env.MAX_FILE_SIZE },
});
