import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StripeMode } from '../../../src/types/settings.js';

type AddressCountryCode = string;

type CheckoutItemPayload = {
  color?: string;
  id: string;
  name: string;
  quantity: number;
  size?: string;
  unitPrice: number;
};

type CheckoutCustomerPayload = {
  cpf?: string;
  documentLabel?: string;
  email: string;
  name: string;
  phone: string;
  phoneCountry?: string;
};

type CheckoutShippingAddressPayload = {
  city: string;
  complement?: string;
  country: AddressCountryCode;
  neighborhood: string;
  number: string;
  postalCode: string;
  region: string;
  street: string;
};

export type StripeTrackedCheckoutDraft = {
  currency: string;
  customer: CheckoutCustomerPayload;
  discount: number;
  items: CheckoutItemPayload[];
  mode: StripeMode;
  orderNumber: string;
  sessionId: string;
  shipping: number;
  shippingAddress: CheckoutShippingAddressPayload;
  shippingMethod?: string;
  subtotal: number;
  total: number;
};

export type StripeWebhookSessionSnapshot = {
  amountTotal: number | null;
  currency: string;
  eventId: string;
  eventType: string;
  mode: StripeMode;
  orderNumber: string;
  paymentIntentId: string;
  paymentStatus: string;
  processedAt: string;
  sessionId: string;
  sessionStatus: string;
};

type TrackedStripeOrderRecord = {
  createdAt: string;
  currency: string;
  customer: CheckoutCustomerPayload | Record<string, never>;
  discount: number;
  items: CheckoutItemPayload[];
  lastEventId: string;
  lastEventType: string;
  metadata: Record<string, string>;
  mode: StripeMode;
  orderNumber: string;
  orderStatus: string;
  paidAt: string | null;
  paymentStatus: string;
  provider: 'stripe';
  sessionStatus: string;
  shipping: number;
  shippingAddress: CheckoutShippingAddressPayload | Record<string, never>;
  shippingMethod: string;
  source: string;
  stripePaymentIntentId: string;
  stripeSessionId: string;
  subtotal: number;
  total: number;
  updatedAt: string;
};

type StripeWebhookLogRecord = {
  eventId: string;
  eventType: string;
  livemode: boolean;
  message: string;
  orderNumber: string;
  payload: Record<string, unknown>;
  processedAt: string;
  status: string;
  stripeSessionId: string;
};

type TrackingFileStore = {
  orders: TrackedStripeOrderRecord[];
  webhookLogs: StripeWebhookLogRecord[];
};

type TrackingBackend = 'file' | 'supabase';

const TRACKING_FILE_PATH = path.resolve(process.cwd(), 'storage', 'stripe-tracking.json');
const FILE_STORE_TEMPLATE: TrackingFileStore = {
  orders: [],
  webhookLogs: [],
};

let cachedSupabaseClient: SupabaseClient | null = null;

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim()
    || process.env.VITE_SUPABASE_URL?.trim()
    || ''
  );
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

function resolveTrackingBackend(): TrackingBackend {
  if (getSupabaseUrl() && getSupabaseServiceRoleKey()) {
    return 'supabase';
  }

  return 'file';
}

function getSupabaseServerClient() {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error('Supabase server envs are missing for Stripe tracking.');
  }

  cachedSupabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabaseClient;
}

function toOrderStatusFromPayment(paymentStatus: string, sessionStatus: string) {
  if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') {
    return 'Pago';
  }

  if (sessionStatus === 'expired') {
    return 'Cancelado';
  }

  return 'Aguardando Pagamento';
}

async function readFileStore() {
  await mkdir(path.dirname(TRACKING_FILE_PATH), { recursive: true });

  try {
    const raw = await readFile(TRACKING_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as TrackingFileStore;

    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      webhookLogs: Array.isArray(parsed.webhookLogs) ? parsed.webhookLogs : [],
    } satisfies TrackingFileStore;
  } catch {
    await writeFile(TRACKING_FILE_PATH, JSON.stringify(FILE_STORE_TEMPLATE, null, 2), 'utf8');
    return {
      ...FILE_STORE_TEMPLATE,
      orders: [],
      webhookLogs: [],
    };
  }
}

async function writeFileStore(store: TrackingFileStore) {
  await mkdir(path.dirname(TRACKING_FILE_PATH), { recursive: true });
  await writeFile(TRACKING_FILE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function normalizeCurrency(value: string) {
  return (value || 'USD').trim().toUpperCase();
}

function toOrderRecordFromDraft(draft: StripeTrackedCheckoutDraft): TrackedStripeOrderRecord {
  const now = new Date().toISOString();

  return {
    provider: 'stripe',
    orderNumber: draft.orderNumber,
    stripeSessionId: draft.sessionId,
    stripePaymentIntentId: '',
    mode: draft.mode,
    sessionStatus: 'open',
    paymentStatus: 'unpaid',
    orderStatus: 'Aguardando Pagamento',
    currency: normalizeCurrency(draft.currency),
    subtotal: Number(draft.subtotal || 0),
    shipping: Number(draft.shipping || 0),
    discount: Number(draft.discount || 0),
    total: Number(draft.total || 0),
    shippingMethod: draft.shippingMethod || '',
    customer: draft.customer,
    shippingAddress: draft.shippingAddress,
    items: draft.items,
    source: 'stripe_checkout',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    lastEventId: '',
    lastEventType: '',
  };
}

function applySessionSnapshotToOrder(
  current: TrackedStripeOrderRecord | null,
  snapshot: StripeWebhookSessionSnapshot,
): TrackedStripeOrderRecord {
  const base: TrackedStripeOrderRecord = current || {
    provider: 'stripe',
    orderNumber: snapshot.orderNumber,
    stripeSessionId: snapshot.sessionId,
    stripePaymentIntentId: '',
    mode: snapshot.mode,
    sessionStatus: snapshot.sessionStatus || 'open',
    paymentStatus: snapshot.paymentStatus || 'unpaid',
    orderStatus: toOrderStatusFromPayment(snapshot.paymentStatus, snapshot.sessionStatus),
    currency: normalizeCurrency(snapshot.currency),
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: Number(snapshot.amountTotal || 0),
    shippingMethod: '',
    customer: {},
    shippingAddress: {},
    items: [],
    source: 'stripe_webhook',
    metadata: {},
    createdAt: snapshot.processedAt,
    updatedAt: snapshot.processedAt,
    paidAt: null,
    lastEventId: '',
    lastEventType: '',
  };

  const nextPaymentStatus = snapshot.paymentStatus || base.paymentStatus || 'unpaid';
  const nextSessionStatus = snapshot.sessionStatus || base.sessionStatus || 'open';
  const becamePaid =
    (nextPaymentStatus === 'paid' || nextPaymentStatus === 'no_payment_required')
    && !base.paidAt;

  return {
    ...base,
    stripeSessionId: snapshot.sessionId || base.stripeSessionId,
    stripePaymentIntentId: snapshot.paymentIntentId || base.stripePaymentIntentId,
    mode: snapshot.mode || base.mode,
    sessionStatus: nextSessionStatus,
    paymentStatus: nextPaymentStatus,
    orderStatus: toOrderStatusFromPayment(nextPaymentStatus, nextSessionStatus),
    currency: normalizeCurrency(snapshot.currency || base.currency),
    total: snapshot.amountTotal ?? base.total,
    updatedAt: snapshot.processedAt,
    paidAt: becamePaid ? snapshot.processedAt : base.paidAt,
    lastEventId: snapshot.eventId,
    lastEventType: snapshot.eventType,
  };
}

function mapOrderRow(row: any): TrackedStripeOrderRecord {
  return {
    provider: 'stripe',
    orderNumber: row.order_number,
    stripeSessionId: row.stripe_session_id || '',
    stripePaymentIntentId: row.stripe_payment_intent_id || '',
    mode: row.mode === 'live' ? 'live' : 'test',
    sessionStatus: row.session_status || 'open',
    paymentStatus: row.payment_status || 'unpaid',
    orderStatus: row.order_status || 'Aguardando Pagamento',
    currency: normalizeCurrency(row.currency || 'USD'),
    subtotal: Number(row.subtotal || 0),
    shipping: Number(row.shipping || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    shippingMethod: row.shipping_method || '',
    customer: row.customer || {},
    shippingAddress: row.shipping_address || {},
    items: row.items || [],
    source: row.source || 'stripe_checkout',
    metadata: row.metadata || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    paidAt: row.paid_at || null,
    lastEventId: row.last_event_id || '',
    lastEventType: row.last_event_type || '',
  };
}

async function persistOrderInSupabase(record: TrackedStripeOrderRecord) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('stripe_checkout_orders')
    .upsert(
      {
        order_number: record.orderNumber,
        stripe_session_id: record.stripeSessionId,
        stripe_payment_intent_id: record.stripePaymentIntentId,
        provider: record.provider,
        mode: record.mode,
        session_status: record.sessionStatus,
        payment_status: record.paymentStatus,
        order_status: record.orderStatus,
        currency: record.currency,
        subtotal: record.subtotal,
        shipping: record.shipping,
        discount: record.discount,
        total: record.total,
        shipping_method: record.shippingMethod,
        customer: record.customer,
        shipping_address: record.shippingAddress,
        items: record.items,
        source: record.source,
        metadata: record.metadata,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        paid_at: record.paidAt,
        last_event_id: record.lastEventId,
        last_event_type: record.lastEventType,
      },
      {
        onConflict: 'order_number',
      },
    );

  if (error) {
    throw new Error(error.message);
  }
}

async function getSupabaseOrderByLookup(orderNumber: string, sessionId: string) {
  const supabase = getSupabaseServerClient();

  if (orderNumber) {
    const { data, error } = await supabase
      .from('stripe_checkout_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return mapOrderRow(data);
    }
  }

  if (!sessionId) {
    return null;
  }

  const { data, error } = await supabase
    .from('stripe_checkout_orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapOrderRow(data) : null;
}

async function persistWebhookLogInSupabase(record: StripeWebhookLogRecord) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('stripe_webhook_logs')
    .upsert(
      {
        event_id: record.eventId,
        event_type: record.eventType,
        order_number: record.orderNumber,
        stripe_session_id: record.stripeSessionId,
        livemode: record.livemode,
        status: record.status,
        message: record.message,
        payload: record.payload,
        processed_at: record.processedAt,
      },
      {
        onConflict: 'event_id',
      },
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function persistStripeCheckoutDraft(draft: StripeTrackedCheckoutDraft) {
  const record = toOrderRecordFromDraft(draft);
  const backend = resolveTrackingBackend();

  if (backend === 'supabase') {
    await persistOrderInSupabase(record);
    return;
  }

  const store = await readFileStore();
  const nextOrders = [
    record,
    ...store.orders.filter(
      (item) => item.orderNumber !== record.orderNumber && item.stripeSessionId !== record.stripeSessionId,
    ),
  ];

  await writeFileStore({
    ...store,
    orders: nextOrders,
  });
}

export async function persistStripeWebhookLog(record: StripeWebhookLogRecord) {
  const backend = resolveTrackingBackend();

  if (backend === 'supabase') {
    await persistWebhookLogInSupabase(record);
    return;
  }

  const store = await readFileStore();
  const nextLogs = [
    record,
    ...store.webhookLogs.filter((item) => item.eventId !== record.eventId),
  ].slice(0, 200);

  await writeFileStore({
    ...store,
    webhookLogs: nextLogs,
  });
}

export async function applyStripeWebhookSessionSnapshot(snapshot: StripeWebhookSessionSnapshot) {
  const backend = resolveTrackingBackend();

  if (backend === 'supabase') {
    const current = await getSupabaseOrderByLookup(snapshot.orderNumber, snapshot.sessionId);
    const next = applySessionSnapshotToOrder(current, snapshot);
    await persistOrderInSupabase(next);
    return next;
  }

  const store = await readFileStore();
  const current = store.orders.find(
    (item) => item.orderNumber === snapshot.orderNumber || item.stripeSessionId === snapshot.sessionId,
  ) || null;
  const next = applySessionSnapshotToOrder(current, snapshot);
  const nextOrders = [
    next,
    ...store.orders.filter(
      (item) => item.orderNumber !== next.orderNumber && item.stripeSessionId !== next.stripeSessionId,
    ),
  ];

  await writeFileStore({
    ...store,
    orders: nextOrders,
  });

  return next;
}
