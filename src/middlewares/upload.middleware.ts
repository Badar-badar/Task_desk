import multer from "multer";
import { AppError } from "../utils/appError";

const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(415, "UNSUPPORTED_FILE_TYPE", "Only JPEG, PNG, WebP, and PDF files are allowed"));
    }
  },
});