import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { registerStripeRoutes } from './integrations/registerStripeRoutes';
import { registerShippingRoute } from './shipping/registerShippingRoute';
import { createStoreRepository } from './store/repository';
import { registerStoreRoutes } from './store/registerStoreRoutes';

function createCorsMiddleware() {
  const allowedOrigins = (process.env.STORE_API_CORS_ORIGIN || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const requestOrigin = request.headers.origin;
    const acceptsAllOrigins = allowedOrigins.includes('*');
    const hasExplicitOrigin = requestOrigin && allowedOrigins.includes(requestOrigin);

    if (acceptsAllOrigins) {
      response.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
    } else if (hasExplicitOrigin && requestOrigin) {
      response.setHeader('Access-Control-Allow-Origin', requestOrigin);
      response.setHeader('Vary', 'Origin');
    }

    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }

    next();
  };
}

async function main() {
  const app = express();
  const port = Number(process.env.STORE_API_PORT || 4000);
  const uploadsRoot = path.resolve(process.cwd(), 'storage', 'uploads');

  await mkdir(uploadsRoot, { recursive: true });

  app.use(createCorsMiddleware());
  app.use(express.json({
    limit: '5mb',
    verify: (request, _response, buffer) => {
      (request as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    },
  }));
  app.use('/uploads', express.static(uploadsRoot));

  const repository = await createStoreRepository();

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'api' });
  });

  app.use('/api/integrations', registerStripeRoutes());
  app.use('/api/store', registerStoreRoutes(repository, uploadsRoot));
  app.use('/api/shipping', registerShippingRoute());

  app.listen(port, () => {
    console.log(`Store API running at http://127.0.0.1:${port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start store API', error);
  process.exitCode = 1;
});
