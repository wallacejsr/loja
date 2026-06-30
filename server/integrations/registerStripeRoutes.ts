import { Router, type Request, type Response } from 'express';
import stripeCheckoutSessionHandler from '../../api/integrations/stripe/checkout-session';
import stripeCredentialsHandler from '../../api/integrations/stripe/credentials';
import stripeSessionStatusHandler from '../../api/integrations/stripe/session-status';
import stripeStatusHandler from '../../api/integrations/stripe/status';
import stripeTestConnectionHandler from '../../api/integrations/stripe/test-connection';
import stripeWebhookHandler from '../../api/integrations/stripe/webhook';

type ExpressLikeHandler = (request: Request, response: Response) => Promise<void>;

function forward(handler: ExpressLikeHandler) {
  return async (request: Request, response: Response) => {
    await handler(request, response);
  };
}

export function registerStripeRoutes() {
  const router = Router();

  router.put('/stripe/credentials', forward(stripeCredentialsHandler as ExpressLikeHandler));
  router.get('/stripe/status', forward(stripeStatusHandler as ExpressLikeHandler));
  router.post('/stripe/test-connection', forward(stripeTestConnectionHandler as ExpressLikeHandler));
  router.post('/stripe/checkout-session', forward(stripeCheckoutSessionHandler as ExpressLikeHandler));
  router.get('/stripe/session-status', forward(stripeSessionStatusHandler as ExpressLikeHandler));
  router.post('/stripe/webhook', forward(stripeWebhookHandler as ExpressLikeHandler));

  return router;
}
