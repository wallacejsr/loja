import { Router } from 'express';
import type { StoreApiConfig } from '../config';
import type { StoreDataDriver } from '../store/repository';

export function registerCoreRoutes(config: StoreApiConfig, dataDriver: StoreDataDriver) {
  const router = Router();

  router.get('/health', (request, response) => {
    response.json({
      ok: true,
      service: 'store-api',
      environment: config.env,
      dataDriver,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      requestId: request.requestId || '',
    });
  });

  router.get('/ready', (request, response) => {
    response.json({
      ok: true,
      service: 'store-api',
      ...(config.env === 'production'
        ? null
        : {
            appBaseUrl: config.appBaseUrl,
            uploadsRoot: config.uploadsRoot,
          }),
      timestamp: new Date().toISOString(),
      requestId: request.requestId || '',
    });
  });

  return router;
}
