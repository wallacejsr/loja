import { requireStripeAdminPermission } from './adminAuth.js';
import { getStripeStatusPayload } from './runtime.js';

type VercelRequestLike = {
  method?: string;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
};

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  res.setHeader?.('Cache-Control', 'no-store');

  const authenticatedAdmin = await requireStripeAdminPermission(req, res, 'integrations:read');
  if (!authenticatedAdmin) {
    return;
  }

  try {
    res.status(200).json(await getStripeStatusPayload());
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Falha ao consultar o status tecnico da Stripe.',
      timestamp: new Date().toISOString(),
    });
  }
}
