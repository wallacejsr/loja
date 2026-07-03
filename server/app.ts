import { mkdir } from 'node:fs/promises';
import express from 'express';
import { getStoreApiConfig } from './config';
import { hashPassword } from './auth/password';
import { registerAdminAuthRoutes } from './auth/registerAdminAuthRoutes';
import { registerCustomerAuthRoutes } from './auth/registerCustomerAuthRoutes';
import { registerStripeRoutes } from './integrations/registerStripeRoutes';
import { attachRequestContext } from './http/middleware/attachRequestContext';
import { createRateLimitMiddleware } from './http/middleware/createRateLimitMiddleware';
import { enforceHttps } from './http/middleware/enforceHttps';
import { parseRequestCookies } from './http/middleware/parseRequestCookies';
import { applySecurityHeaders } from './http/middleware/applySecurityHeaders';
import { createCorsMiddleware } from './http/createCorsMiddleware';
import { registerCoreRoutes } from './http/registerCoreRoutes';
import { registerShippingRoute } from './shipping/registerShippingRoute';
import { createStoreRepository, getConfiguredStoreDriver } from './store/repository';
import { registerStoreRoutes } from './store/registerStoreRoutes';

export async function createStoreApiApp() {
  const config = getStoreApiConfig();
  const dataDriver = getConfiguredStoreDriver();
  const repository = await createStoreRepository();
  const bootstrapAdminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const bootstrapAdminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
  const bootstrapAdminName = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'Administrator';
  const app = express();

  app.disable('x-powered-by');

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  await mkdir(config.uploadsRoot, { recursive: true });

  if (bootstrapAdminEmail && bootstrapAdminPassword) {
    const passwordHash = await hashPassword(bootstrapAdminPassword, config);
    await repository.ensureAdminUser({
      email: bootstrapAdminEmail,
      fullName: bootstrapAdminName,
      passwordHash,
      role: 'administrator',
    });
  }

  app.use(attachRequestContext());
  app.use(enforceHttps(config));
  app.use(createCorsMiddleware(config));
  app.use(applySecurityHeaders());
  app.use(parseRequestCookies());
  app.use(createRateLimitMiddleware(config.rateLimit));
  app.use(express.json({
    limit: config.bodyLimit,
    verify: (request, _response, buffer) => {
      (request as express.Request).rawBody = Buffer.from(buffer);
    },
  }));
  app.use(express.urlencoded({
    extended: true,
    limit: config.bodyLimit,
  }));
  app.use('/uploads', express.static(config.uploadsRoot));

  app.use('/api', registerCoreRoutes(config, dataDriver));
  app.use('/api/admin', registerAdminAuthRoutes(repository, config));
  app.use('/api/account', registerCustomerAuthRoutes(repository, config));
  app.use('/api/integrations', registerStripeRoutes(repository, config));
  app.use('/api/store', registerStoreRoutes(repository, config, config.uploadsRoot));
  app.use('/api/shipping', registerShippingRoute());

  app.use('/api', (request, response) => {
    response.status(404).json({
      ok: false,
      message: `API route not found: ${request.method} ${request.originalUrl}`,
      requestId: request.requestId || '',
    });
  });

  app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error', {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      error,
    });

    response.status(500).json({
      ok: false,
      message: 'Internal server error.',
      requestId: request.requestId || '',
    });
  });

  return {
    app,
    config,
  };
}
