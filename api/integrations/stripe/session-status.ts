import { getStripeCandidateSecretKeys } from './runtime.js';

type VercelRequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
};

type StripeSessionStatusResponse = {
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  orderNumber: string;
  paid: boolean;
  paymentStatus: string | null;
  sessionId: string;
  sessionStatus: string | null;
  success: true;
};

type TrackedStripeAdminOrder = {
  orderNumber: string;
  paymentStatus: string;
  sessionStatus: string;
  total: number;
};

function getQueryValue(query: VercelRequestLike['query'], key: string) {
  const value = query?.[key];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function isValidSessionId(value: string) {
  return /^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(value.trim());
}

function isValidOrderNumber(value: string) {
  return /^#[A-Z0-9_-]{6,40}$/i.test(value.trim());
}

async function fetchStripeSession(sessionId: string, secretKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `Stripe request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as any;
}

function buildResponsePayload(session: any): StripeSessionStatusResponse {
  const paymentStatus = typeof session?.payment_status === 'string' ? session.payment_status : null;
  const sessionStatus = typeof session?.status === 'string' ? session.status : null;
  const orderNumber = String(session?.metadata?.order_number || session?.client_reference_id || '');

  return {
    success: true,
    sessionId: String(session?.id || ''),
    orderNumber,
    paid: paymentStatus === 'paid' || paymentStatus === 'no_payment_required',
    paymentStatus,
    sessionStatus,
    customerEmail: session?.customer_details?.email || session?.customer_email || null,
    amountTotal: typeof session?.amount_total === 'number' ? session.amount_total / 100 : null,
    currency: session?.currency ? String(session.currency).toUpperCase() : null,
  };
}

async function findTrackedOrder(orderNumber: string) {
  const tracking = await import('./tracking.js');
  const payload = await tracking.listTrackedStripeAdminOrders() as { orders: TrackedStripeAdminOrder[] };
  return payload.orders.find((order) => order.orderNumber === orderNumber) || null;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  res.setHeader?.('Cache-Control', 'no-store');

  const sessionId = getQueryValue(req.query, 'session_id').trim();
  const orderNumber = getQueryValue(req.query, 'order_number').trim();

  if (!sessionId || !orderNumber) {
    res.status(400).json({
      success: false,
      message: 'session_id and order_number are required.',
    });
    return;
  }

  if (!isValidSessionId(sessionId) || !isValidOrderNumber(orderNumber)) {
    res.status(400).json({
      success: false,
      message: 'Invalid Stripe session lookup parameters.',
    });
    return;
  }

  const secretKeys = await getStripeCandidateSecretKeys();

  if (secretKeys.length === 0) {
    res.status(503).json({
      success: false,
      message: 'Stripe secret key is missing in secure storage and server environment.',
    });
    return;
  }

  let lastError = 'Unable to verify Stripe session.';

  for (const secretKey of secretKeys) {
    try {
      const session = await fetchStripeSession(sessionId, secretKey);
      const resolvedOrderNumber = String(session?.metadata?.order_number || session?.client_reference_id || '').trim();

      if (resolvedOrderNumber !== orderNumber) {
        throw new Error('Stripe session does not match the informed order number.');
      }

      const trackedOrder = await findTrackedOrder(orderNumber);
      if (!trackedOrder) {
        throw new Error('Tracked Stripe order was not found for this checkout session.');
      }

      res.status(200).json(buildResponsePayload(session));
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  res.status(400).json({
    success: false,
    message: lastError,
  });
}
