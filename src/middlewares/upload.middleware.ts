/**
 * Multer upload middleware for local file storage.
 * Stores files under /uploads/{trips|cars|landmarks|licenses}
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { UPLOAD_PATHS } from '../config/constants.js';
import { AppError } from './errorHandler.js';

const maxSizeBytes = config.MAX_FILE_SIZE_MB * 1024 * 1024;

const rootUploads = path.join(process.cwd(), config.UPLOAD_DIR);

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ensure base uploads dir exists
ensureDir(rootUploads);
Object.values(UPLOAD_PATHS).forEach((p) => ensureDir(path.join(rootUploads, p)));

interface RequestWithUploadDir extends Request {
  uploadSubDir?: string;
}

const storage = multer.diskStorage({
  destination: (req: RequestWithUploadDir, _file: Express.Multer.File, cb: (error: Error | null, dest: string) => void) => {
    const subDir = req.uploadSubDir ?? UPLOAD_PATHS.TRIPS;
    const dest = path.join(rootUploads, subDir);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, name: string) => void) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
  if (!allowed) {
    cb(new AppError('Only image files (jpeg, png, gif, webp) are allowed', 400));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeBytes },
});

/**
 * Middleware factory: upload to a specific subfolder.
 * Usage: uploadTo('cars'), uploadTo('licenses')
 */
export function uploadTo(subDir: keyof typeof UPLOAD_PATHS) {
  return (req: Request, _res: Response, next: (err?: unknown) => void) => {
    (req as RequestWithUploadDir).uploadSubDir = UPLOAD_PATHS[subDir];
    next();
  };
}

/** Relative path to store in DB: e.g. trips/xxx.jpg */
export function getRelativeImagePath(subDir: keyof typeof UPLOAD_PATHS, filename: string): string {
  return `${UPLOAD_PATHS[subDir]}/${filename}`;
}

/** Delete physical image file by relative path (e.g. trips/xxx.jpg). Silently ignores if file does not exist. */
export function deleteImageFile(relativePath: string): void {
  if (!relativePath?.trim()) return;
  try {
    const fullPath = path.join(rootUploads, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // Ignore errors (file not found, permission, etc.)
  }
}

/** Delete multiple image files by relative paths. */
export function deleteImageFiles(relativePaths: string[]): void {
  for (const p of relativePaths) {
    deleteImageFile(p);
  }
}
