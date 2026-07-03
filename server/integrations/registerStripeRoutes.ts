import { Router, type Request, type Response } from 'express';
import stripeAdminOrderStatusHandler from '../../api/integrations/stripe/admin/order-status';
import stripeAdminOrdersHandler from '../../api/integrations/stripe/admin/orders';
import stripeCheckoutSessionHandler from '../../api/integrations/stripe/checkout-session';
import stripeCredentialsHandler from '../../api/integrations/stripe/credentials';
import stripeSessionStatusHandler from '../../api/integrations/stripe/session-status';
import stripeStatusHandler from '../../api/integrations/stripe/status';
import stripeTestConnectionHandler from '../../api/integrations/stripe/test-connection';
import stripeWebhookHandler from '../../api/integrations/stripe/webhook';
import type { StoreApiConfig } from '../config';
import { requireAdminPermission } from '../auth/adminRouteAuth';
import type { StoreRepository } from '../store/types';

type ExpressLikeHandler = (request: Request, response: Response) => Promise<void>;

function forward(handler: ExpressLikeHandler) {
  return async (request: Request, response: Response) => {
    await handler(request, response);
  };
}

export function registerStripeRoutes(repository: StoreRepository, config: StoreApiConfig) {
  const router = Router();

  router.put('/stripe/credentials', requireAdminPermission(repository, config, 'integrations:write'), forward(stripeCredentialsHandler as ExpressLikeHandler));
  router.get('/stripe/status', requireAdminPermission(repository, config, 'integrations:read'), forward(stripeStatusHandler as ExpressLikeHandler));
  router.post('/stripe/test-connection', requireAdminPermission(repository, config, 'integrations:write'), forward(stripeTestConnectionHandler as ExpressLikeHandler));
  router.post('/stripe/checkout-session', forward(stripeCheckoutSessionHandler as ExpressLikeHandler));
  router.get('/stripe/session-status', forward(stripeSessionStatusHandler as ExpressLikeHandler));
  router.get('/stripe/admin/orders', requireAdminPermission(repository, config, 'orders:read'), forward(stripeAdminOrdersHandler as ExpressLikeHandler));
  router.patch('/stripe/admin/order-status', requireAdminPermission(repository, config, 'orders:write'), forward(stripeAdminOrderStatusHandler as ExpressLikeHandler));
  router.post('/stripe/webhook', forward(stripeWebhookHandler as ExpressLikeHandler));

  return router;
}
