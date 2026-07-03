import type express from 'express';

type RateLimitConfig = {
  maxRequests: number;
  skipPaths: string[];
  windowMs: number;
};

type RateLimitRule = {
  id: string;
  matchMode?: 'exact' | 'prefix';
  maxRequests: number;
  methods?: string[];
  paths: string[];
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

function matchesRulePath(pathname: string, rule: RateLimitRule) {
  const mode = rule.matchMode || 'exact';
  return rule.paths.some((path) => (mode === 'prefix' ? pathname.startsWith(path) : pathname === path));
}

function resolvePolicy(request: express.Request, config: RateLimitConfig, rules: RateLimitRule[]) {
  const pathname = request.path;
  const method = request.method.toUpperCase();

  for (const rule of rules) {
    if (rule.methods?.length && !rule.methods.includes(method)) {
      continue;
    }

    if (matchesRulePath(pathname, rule)) {
      return rule;
    }
  }

  return {
    id: 'default',
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
  };
}

export function createRateLimitMiddleware(config: RateLimitConfig, rules: RateLimitRule[] = []) {
  const bucket = new Map<string, RateLimitEntry>();

  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (request.method.toUpperCase() === 'OPTIONS') {
      next();
      return;
    }

    if (config.skipPaths.some((path) => request.path.startsWith(path))) {
      next();
      return;
    }

    const policy = resolvePolicy(request, config, rules);
    const now = Date.now();
    const ip = request.clientIp || request.socket.remoteAddress || 'unknown';
    const key = `${policy.id}:${ip}:${request.method.toUpperCase()}`;
    const current = bucket.get(key);

    response.setHeader('X-RateLimit-Limit', String(policy.maxRequests));

    if (!current || current.resetAt <= now) {
      bucket.set(key, {
        count: 1,
        resetAt: now + policy.windowMs,
      });
      response.setHeader('X-RateLimit-Remaining', String(Math.max(policy.maxRequests - 1, 0)));
      next();
      return;
    }

    current.count += 1;
    response.setHeader('X-RateLimit-Remaining', String(Math.max(policy.maxRequests - current.count, 0)));

    if (current.count > policy.maxRequests) {
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
