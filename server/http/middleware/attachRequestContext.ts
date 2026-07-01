import { randomUUID } from 'node:crypto';
import type express from 'express';

function extractClientIp(request: express.Request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (forwardedValue) {
    return forwardedValue.split(',')[0]?.trim() || request.socket.remoteAddress || '';
  }

  return request.socket.remoteAddress || '';
}

export function attachRequestContext() {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    request.requestId = randomUUID();
    request.clientIp = extractClientIp(request);
    response.setHeader('X-Request-Id', request.requestId);
    next();
  };
}

