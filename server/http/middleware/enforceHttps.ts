import type express from 'express';
import type { StoreApiConfig } from '../../config';

function isLocalHost(hostname: string) {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname.endsWith('.local');
}

export function enforceHttps(config: StoreApiConfig) {
  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (!config.https.enforce) {
      next();
      return;
    }

    const host = String(request.headers.host || '').split(':')[0];
    const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();

    if (!host || isLocalHost(host) || !forwardedProto || forwardedProto === 'https') {
      next();
      return;
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      response.redirect(301, `https://${request.headers.host}${request.originalUrl}`);
      return;
    }

    response.status(400).json({
      ok: false,
      message: 'HTTPS is required for this endpoint.',
      requestId: request.requestId || '',
    });
  };
}

