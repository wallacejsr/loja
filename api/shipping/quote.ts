import { handleShippingQuoteRequest } from '../../server/shipping/quoteHandler';

export default async function handler(req: any, res: any) {
  await handleShippingQuoteRequest(req, res);
}
