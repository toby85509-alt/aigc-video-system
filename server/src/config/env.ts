import dotenv from 'dotenv';
import path from 'path';

const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const APP_ROOT = path.resolve(SERVER_ROOT, '..');

export function loadEnv() {
  dotenv.config({ path: path.join(APP_ROOT, '.env') });

  const configuredUploadDir = process.env.UPLOAD_DIR || './uploads';
  process.env.UPLOAD_DIR = path.isAbsolute(configuredUploadDir)
    ? configuredUploadDir
    : path.resolve(SERVER_ROOT, configuredUploadDir);
}

export function getUploadDir() {
  if (!process.env.UPLOAD_DIR) loadEnv();
  return process.env.UPLOAD_DIR || path.resolve(SERVER_ROOT, 'uploads');
}
