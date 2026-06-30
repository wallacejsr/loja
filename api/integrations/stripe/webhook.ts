import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  applyStripeWebhookSessionSnapshot,
  persistStripeWebhookLog,
  type StripeWebhookSessionSnapshot,
} from './tracking.js';
import { getStripeCandidateWebhookSecrets } from './runtime.js';

type StripeMode = 'live' | 'test';

type VercelRequestLike = {
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  rawBody?: Buffer | Uint8Array | string;
  readable?: boolean;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  status: (code: number) => VercelResponseLike;
};

type StripeWebhookEvent = {
  created?: number;
  data?: {
    object?: Record<string, any>;
  };
  id?: string;
  livemode?: boolean;
  type?: string;
};

type VerifiedWebhookSecret = {
  mode: StripeMode;
  secret: string;
  source: 'database' | 'environment';
};

type ParsedStripeSignature = {
  timestamp: string;
  v1Signatures: string[];
};

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

export const config = {
  api: {
    bodyParser: false,
  },
};

function getHeaderValue(headers: VercelRequestLike['headers'], key: string) {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

async function readRawBody(request: VercelRequestLike) {
  if (Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (typeof request.body === 'string') {
    return Buffer.from(request.body);
  }

  if (Buffer.isBuffer(request.rawBody)) {
    return request.rawBody;
  }

  if (request.rawBody instanceof Uint8Array) {
    return Buffer.from(request.rawBody);
  }

  if (typeof request.rawBody === 'string') {
    return Buffer.from(request.rawBody);
  }

  if (request.body && typeof request.body === 'object') {
    return Buffer.from(JSON.stringify(request.body));
  }

  if (typeof request.on !== 'function') {
    return Buffer.from('');
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on?.('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on?.('end', () => {
      resolve(Buffer.concat(chunks));
    });
    request.on?.('error', reject);
  });
}

function parseStripeSignatureHeader(headerValue: string): ParsedStripeSignature | null {
  if (!headerValue.trim()) {
    return null;
  }

  const parts = headerValue.split(',');
  let timestamp = '';
  const v1Signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=').map((item) => item.trim());

    if (key === 't') {
      timestamp = value || '';
    }

    if (key === 'v1' && value) {
      v1Signatures.push(value);
    }
  }

  if (!timestamp || v1Signatures.length === 0) {
    return null;
  }

  return {
    timestamp,
    v1Signatures,
  };
}

function buildStripeSignature(timestamp: string, payload: Buffer, secret: string) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(payload)
    .digest('hex');
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function enforceSignatureFreshness(timestamp: string) {
  const parsedTimestamp = Number(timestamp);

  if (!Number.isFinite(parsedTimestamp)) {
    throw new Error('O cabecalho Stripe-Signature veio sem timestamp valido.');
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const ageInSeconds = Math.abs(currentTimestamp - parsedTimestamp);

  if (ageInSeconds > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error('A assinatura do webhook Stripe expirou ou esta fora da janela de tolerancia.');
  }
}

function verifyStripeSignature(
  payload: Buffer,
  signatureHeader: string,
  candidates: VerifiedWebhookSecret[],
) {
  const parsed = parseStripeSignatureHeader(signatureHeader);

  if (!parsed) {
    throw new Error('Cabecalho Stripe-Signature ausente ou invalido.');
  }

  enforceSignatureFreshness(parsed.timestamp);

  for (const candidate of candidates) {
    const expectedSignature = buildStripeSignature(parsed.timestamp, payload, candidate.secret);

    if (parsed.v1Signatures.some((signature) => secureCompare(signature, expectedSignature))) {
      return candidate;
    }
  }

  throw new Error('Nao foi possivel validar a assinatura do webhook Stripe com os segredos configurados.');
}

function parseWebhookEvent(rawBody: Buffer) {
  try {
    return JSON.parse(rawBody.toString('utf8')) as StripeWebhookEvent;
  } catch {
    throw new Error('O payload do webhook Stripe nao esta em JSON valido.');
  }
}

function normalizeModeFromEvent(event: StripeWebhookEvent): StripeMode {
  return event.livemode ? 'live' : 'test';
}

function buildSessionSnapshot(event: StripeWebhookEvent): StripeWebhookSessionSnapshot | null {
  const session = event.data?.object;

  if (!session || session.object !== 'checkout.session') {
    return null;
  }

  const metadata = session.metadata || {};
  const orderNumber = String(metadata.order_number || session.client_reference_id || '').trim();
  const sessionId = String(session.id || '').trim();

  if (!orderNumber && !sessionId) {
    return null;
  }

  return {
    amountTotal: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
    currency: String(session.currency || 'USD').toUpperCase(),
    eventId: String(event.id || ''),
    eventType: String(event.type || ''),
    mode: normalizeModeFromEvent(event),
    orderNumber,
    paymentIntentId: String(session.payment_intent || '').trim(),
    paymentStatus: String(session.payment_status || '').trim() || 'unpaid',
    processedAt: new Date().toISOString(),
    sessionId,
    sessionStatus: String(session.status || '').trim() || 'open',
  };
}

function isHandledCheckoutEvent(eventType: string) {
  return [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired',
  ].includes(eventType);
}

function toPlainPayload(event: StripeWebhookEvent) {
  return event as Record<string, unknown>;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  const signatureHeader = getHeaderValue(req.headers, 'stripe-signature');

  try {
    const candidates = await getStripeCandidateWebhookSecrets();

    if (candidates.length === 0) {
      throw new Error('Nenhum webhook secret da Stripe foi encontrado no storage privado ou nas env vars.');
    }

    const rawBody = await readRawBody(req);
    const verifiedSecret = verifyStripeSignature(rawBody, signatureHeader, candidates);
    const event = parseWebhookEvent(rawBody);
    const eventType = String(event.type || '').trim();
    const sessionSnapshot = buildSessionSnapshot(event);
    const processedAt = new Date().toISOString();
    let persistenceError = '';

    try {
      await persistStripeWebhookLog({
        eventId: String(event.id || ''),
        eventType,
        orderNumber: sessionSnapshot?.orderNumber || '',
        stripeSessionId: sessionSnapshot?.sessionId || '',
        livemode: Boolean(event.livemode),
        status: isHandledCheckoutEvent(eventType) ? 'received' : 'ignored',
        message: isHandledCheckoutEvent(eventType)
          ? 'Evento Stripe recebido e validado.'
          : 'Evento recebido, mas ainda sem rotina operacional dedicada.',
        payload: toPlainPayload(event),
        processedAt,
      });

      if (sessionSnapshot && isHandledCheckoutEvent(eventType)) {
        await applyStripeWebhookSessionSnapshot({
          ...sessionSnapshot,
          processedAt,
        });
      }
    } catch (error) {
      persistenceError = error instanceof Error ? error.message : 'Falha ao persistir o evento Stripe.';
      console.error('Stripe webhook persistence warning:', error);
    }

    res.status(200).json({
      success: true,
      acknowledged: true,
      eventId: String(event.id || ''),
      eventType,
      livemode: Boolean(event.livemode),
      webhookMode: Boolean(event.livemode) ? 'live' : 'test',
      webhookSource: verifiedSecret.source,
      handled: isHandledCheckoutEvent(eventType),
      orderNumber: sessionSnapshot?.orderNumber || '',
      sessionId: sessionSnapshot?.sessionId || '',
      persistenceError: persistenceError || null,
      processedAt,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Nao foi possivel processar o webhook Stripe.',
    });
  }
}
