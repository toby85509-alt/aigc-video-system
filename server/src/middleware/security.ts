import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function getPublicAccessToken(): string {
  return process.env.PUBLIC_ACCESS_TOKEN || process.env.ADMIN_ACCESS_TOKEN || '';
}

export function requireAccessToken(req: Request, res: Response, next: NextFunction) {
  const expected = getPublicAccessToken();
  if (!expected) {
    next();
    return;
  }

  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  const token = String(req.headers['x-access-token'] || bearer || '');

  if (!token || !safeEqual(token, expected)) {
    res.status(401).json({ error: '请先输入有效访问码' });
    return;
  }

  next();
}

export function validateAccessToken(req: Request, res: Response) {
  const expected = getPublicAccessToken();
  const token = String(req.body?.token || '');

  if (!expected) {
    res.json({ data: { ok: true, protected: false } });
    return;
  }

  if (!token || !safeEqual(token, expected)) {
    res.status(401).json({ error: '访问码不正确' });
    return;
  }

  res.json({ data: { ok: true, protected: true } });
}

export function protectWriteOperations(req: Request, res: Response, next: NextFunction) {
  requireAccessToken(req, res, next);
}
