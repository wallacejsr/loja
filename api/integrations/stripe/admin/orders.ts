import { requireStripeAdminPermission } from '../adminAuth.js';
import { listTrackedStripeAdminOrders } from '../tracking.js';

type VercelRequestLike = {
  method?: string;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
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

  const authenticatedAdmin = await requireStripeAdminPermission(req, res, 'orders:read');
  if (!authenticatedAdmin) {
    return;
  }

  try {
    res.status(200).json(await listTrackedStripeAdminOrders());
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Nao foi possivel listar os pedidos Stripe.',
    });
  }
}
