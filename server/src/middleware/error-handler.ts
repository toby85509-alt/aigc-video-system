import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(
      JSON.stringify({
        level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
        method,
        url,
        status: statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  next();
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(
    JSON.stringify({
      level: 'error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    }),
  );
  res.status(500).json({
    error: err.message || '服务器内部错误',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: '接口不存在' });
}
