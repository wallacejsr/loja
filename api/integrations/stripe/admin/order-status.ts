import { requireStripeAdminPermission } from '../adminAuth.js';
import { updateTrackedStripeOrderStatus, type TrackedOrderStatus } from '../tracking.js';

type VercelRequestLike = {
  body?: {
    orderNumber?: string;
    status?: string;
    user?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  status: (code: number) => VercelResponseLike;
};

function getHeaderValue(headers: VercelRequestLike['headers'], key: string) {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function normalizeStatusKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isTrackedOrderStatus(value: string): value is TrackedOrderStatus {
  return [
    'aguardando pagamento',
    'pago',
    'em separacao',
    'enviado',
    'entregue',
    'cancelado',
  ].includes(normalizeStatusKey(value));
}

function resolveRequestIp(headers: VercelRequestLike['headers']) {
  const forwardedFor = getHeaderValue(headers, 'x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '127.0.0.1';
  }

  return '127.0.0.1';
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'PATCH') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  const authenticatedAdmin = await requireStripeAdminPermission(req, res, 'orders:write');
  if (!authenticatedAdmin) {
    return;
  }

  try {
    const orderNumber = req.body?.orderNumber?.trim() || '';
    const status = req.body?.status?.trim() || '';
    const user = authenticatedAdmin.email || req.body?.user?.trim() || 'Admin Loja';

    if (!orderNumber) {
      throw new Error('Informe o numero do pedido antes de atualizar o status.');
    }

    if (!isTrackedOrderStatus(status)) {
      throw new Error('Selecione um status valido para o pedido.');
    }

    const order = await updateTrackedStripeOrderStatus(
      orderNumber,
      status,
      user,
      resolveRequestIp(req.headers),
    );

    res.status(200).json({
      success: true,
      order,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Nao foi possivel atualizar o status do pedido Stripe.',
    });
  }
}
