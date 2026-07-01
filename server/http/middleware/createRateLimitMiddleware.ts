import type express from 'express';

type RateLimitConfig = {
  maxRequests: number;
  skipPaths: string[];
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimitMiddleware(config: RateLimitConfig) {
  const bucket = new Map<string, RateLimitEntry>();

  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (config.skipPaths.some((path) => request.path.startsWith(path))) {
      next();
      return;
    }

    const now = Date.now();
    const ip = request.clientIp || request.socket.remoteAddress || 'unknown';
    const key = `${ip}:${request.method}`;
    const current = bucket.get(key);

    if (!current || current.resetAt <= now) {
      bucket.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      next();
      return;
    }

    current.count += 1;

    if (current.count > config.maxRequests) {
      response.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      response.status(429).json({
        ok: false,
        message: 'Too many requests. Please try again in a moment.',
        requestId: request.requestId || '',
      });
      return;
    }

    next();
  };
}

