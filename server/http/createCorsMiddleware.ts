import type express from 'express';
import type { StoreApiConfig } from '../config';

export function createCorsMiddleware(config: StoreApiConfig) {
  const allowedOrigins = config.corsOrigins;

  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const requestOrigin = request.headers.origin;
    const acceptsAllOrigins = allowedOrigins.includes('*');
    const hasExplicitOrigin = Boolean(requestOrigin && allowedOrigins.includes(requestOrigin));

    if (acceptsAllOrigins) {
      response.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
      if (requestOrigin) {
        response.setHeader('Vary', 'Origin');
      }
    } else if (hasExplicitOrigin && requestOrigin) {
      response.setHeader('Access-Control-Allow-Origin', requestOrigin);
      response.setHeader('Vary', 'Origin');
    }

    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Keepalive-Token');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    response.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }

    next();
  };
}

