import { Router } from 'express';
import { handleShippingQuoteRequest } from './quoteHandler';

export function registerShippingRoute() {
  const router = Router();

  router.post('/quote', async (request, response) => {
    await handleShippingQuoteRequest(request, response);
  });

  router.all('/quote', async (request, response) => {
    await handleShippingQuoteRequest(request, response);
  });

  return router;
}
