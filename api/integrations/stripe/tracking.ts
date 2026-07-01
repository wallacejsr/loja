import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StripeMode } from '../../../src/types/settings.ts';

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

export type TrackedOrderStatus =
  | 'Aguardando Pagamento'
  | 'Pago'
  | 'Em Separacao'
  | 'Em Separação'
  | 'Em SeparaÃ§Ã£o'
  | 'Enviado'
  | 'Entregue'
  | 'Cancelado';

export type StripeTrackedCheckoutDraft = {
  currency: string;
  customer: CheckoutCustomerPayload;
  discount: number;
  items: CheckoutItemPayload[];
  mode: StripeMode;
  orderNumber: string;
  paymentMethod?: string;
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

export type StripeTrackedAdminOrder = {
  customer: {
    cpf?: string;
    documentLabel?: string;
    email: string;
    name: string;
    phone: string;
    phoneCountry?: string;
    phoneE164?: string;
  };
  discount: number;
  history: {
    createdAt: string;
    deliveredAt?: string;
    paidAt?: string;
    shippedAt?: string;
  };
  id: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    sku: string;
    subtotal: number;
    unitPrice: number;
  }>;
  logs: Array<{
    action: string;
    dateTime: string;
    id: string;
    ip: string;
    user: string;
  }>;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  purchaseDate: string;
  sessionStatus: string;
  shipping: number;
  shippingAddress: {
    cep: string;
    city: string;
    complement?: string;
    country?: AddressCountryCode;
    district: string;
    number: string;
    state: string;
    street: string;
  };
  source: 'stripe-server';
  status: TrackedOrderStatus;
  stripeMode: StripeMode;
  subtotal: number;
  total: number;
};

export type StripeWebhookLogRecord = {
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

export type StripeTrackingBackend = 'file' | 'supabase';

type TrackedOrderLog = {
  action: string;
  dateTime: string;
  id: string;
  ip: string;
  user: string;
};

type TrackedStripeOrderRecord = {
  createdAt: string;
  currency: string;
  customer: CheckoutCustomerPayload | Record<string, never>;
  deliveredAt: string | null;
  discount: number;
  items: CheckoutItemPayload[];
  lastEventId: string;
  lastEventType: string;
  logs: TrackedOrderLog[];
  metadata: Record<string, string>;
  mode: StripeMode;
  orderNumber: string;
  orderStatus: TrackedOrderStatus;
  paidAt: string | null;
  paymentMethod: string;
  paymentStatus: string;
  provider: 'stripe';
  sessionStatus: string;
  shippedAt: string | null;
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

type TrackingFileStore = {
  orders: TrackedStripeOrderRecord[];
  webhookLogs: StripeWebhookLogRecord[];
};

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

export function resolveTrackingBackend(): StripeTrackingBackend {
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

function normalizeCurrency(value: string) {
  return (value || 'USD').trim().toUpperCase();
}

function normalizeStatusKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isAdvancedOperationalStatus(status: string) {
  const key = normalizeStatusKey(status);
  return key === 'em separacao' || key === 'enviado' || key === 'entregue';
}

function createOrderLog(user: string, ip: string, action: string, dateTime = new Date().toISOString()): TrackedOrderLog {
  return {
    id: randomUUID(),
    user,
    ip,
    action,
    dateTime,
  };
}

function derivePaymentStatusOrderStatus(paymentStatus: string, sessionStatus: string): TrackedOrderStatus {
  if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') {
    return 'Pago';
  }

  if (sessionStatus === 'expired') {
    return 'Cancelado';
  }

  return 'Aguardando Pagamento';
}

function resolveWebhookOrderStatus(
  currentStatus: TrackedOrderStatus | '',
  paymentStatus: string,
  sessionStatus: string,
): TrackedOrderStatus {
  const derivedStatus = derivePaymentStatusOrderStatus(paymentStatus, sessionStatus);

  if (!currentStatus) {
    return derivedStatus;
  }

  if (isAdvancedOperationalStatus(currentStatus)) {
    return currentStatus;
  }

  if (normalizeStatusKey(currentStatus) === 'cancelado' && derivedStatus !== 'Pago') {
    return currentStatus;
  }

  return derivedStatus;
}

function buildWebhookAction(snapshot: StripeWebhookSessionSnapshot) {
  switch (snapshot.eventType) {
    case 'checkout.session.completed':
      return snapshot.paymentStatus === 'paid' || snapshot.paymentStatus === 'no_payment_required'
        ? 'Pagamento confirmado pela Stripe.'
        : 'Sessao de checkout concluida na Stripe.';
    case 'checkout.session.async_payment_succeeded':
      return 'Pagamento assincrono confirmado pela Stripe.';
    case 'checkout.session.async_payment_failed':
      return 'Pagamento assincrono falhou na Stripe.';
    case 'checkout.session.expired':
      return 'Sessao de checkout expirada na Stripe.';
    default:
      return `Evento recebido da Stripe: ${snapshot.eventType}.`;
  }
}

function buildItemSku(item: CheckoutItemPayload) {
  return [item.id, item.size || 'U', item.color || 'PADRAO']
    .join('-')
    .toUpperCase();
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return value as T;
  }

  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
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

function ensureTrackedOrderDefaults(record: Partial<TrackedStripeOrderRecord>): TrackedStripeOrderRecord {
  const createdAt = safeString(record.createdAt) || new Date().toISOString();
  const paymentStatus = safeString(record.paymentStatus) || 'unpaid';
  const sessionStatus = safeString(record.sessionStatus) || 'open';
  const currentStatus = safeString(record.orderStatus) as TrackedOrderStatus | '';

  return {
    provider: 'stripe',
    orderNumber: safeString(record.orderNumber),
    stripeSessionId: safeString(record.stripeSessionId),
    stripePaymentIntentId: safeString(record.stripePaymentIntentId),
    mode: record.mode === 'live' ? 'live' : 'test',
    sessionStatus,
    paymentStatus,
    orderStatus: resolveWebhookOrderStatus(currentStatus, paymentStatus, sessionStatus),
    currency: normalizeCurrency(safeString(record.currency)),
    subtotal: Number(record.subtotal || 0),
    shipping: Number(record.shipping || 0),
    discount: Number(record.discount || 0),
    total: Number(record.total || 0),
    shippingMethod: safeString(record.shippingMethod),
    paymentMethod: safeString(record.paymentMethod) || 'Stripe Checkout',
    customer: record.customer || {},
    shippingAddress: record.shippingAddress || {},
    items: Array.isArray(record.items) ? record.items : [],
    source: safeString(record.source) || 'stripe_checkout',
    metadata: record.metadata || {},
    createdAt,
    updatedAt: safeString(record.updatedAt) || createdAt,
    paidAt: record.paidAt || null,
    shippedAt: record.shippedAt || null,
    deliveredAt: record.deliveredAt || null,
    lastEventId: safeString(record.lastEventId),
    lastEventType: safeString(record.lastEventType),
    logs: Array.isArray(record.logs) ? record.logs : [],
  };
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
    paymentMethod: draft.paymentMethod || 'Stripe Checkout',
    customer: draft.customer,
    shippingAddress: draft.shippingAddress,
    items: draft.items,
    source: 'stripe_checkout',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    lastEventId: '',
    lastEventType: '',
    logs: [
      createOrderLog('Stripe Checkout', 'server', 'Checkout Stripe iniciado com status Aguardando Pagamento.', now),
    ],
  };
}

function applySessionSnapshotToOrder(
  current: TrackedStripeOrderRecord | null,
  snapshot: StripeWebhookSessionSnapshot,
): TrackedStripeOrderRecord {
  const base = ensureTrackedOrderDefaults(current || {
    provider: 'stripe',
    orderNumber: snapshot.orderNumber,
    stripeSessionId: snapshot.sessionId,
    stripePaymentIntentId: '',
    mode: snapshot.mode,
    sessionStatus: snapshot.sessionStatus || 'open',
    paymentStatus: snapshot.paymentStatus || 'unpaid',
    orderStatus: derivePaymentStatusOrderStatus(snapshot.paymentStatus, snapshot.sessionStatus),
    currency: normalizeCurrency(snapshot.currency),
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: Number(snapshot.amountTotal || 0),
    shippingMethod: '',
    paymentMethod: 'Stripe Checkout',
    customer: {},
    shippingAddress: {},
    items: [],
    source: 'stripe_webhook',
    metadata: {},
    createdAt: snapshot.processedAt,
    updatedAt: snapshot.processedAt,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    lastEventId: '',
    lastEventType: '',
    logs: [],
  });

  const nextPaymentStatus = snapshot.paymentStatus || base.paymentStatus || 'unpaid';
  const nextSessionStatus = snapshot.sessionStatus || base.sessionStatus || 'open';
  const nextOrderStatus = resolveWebhookOrderStatus(base.orderStatus, nextPaymentStatus, nextSessionStatus);
  const becamePaid =
    (nextPaymentStatus === 'paid' || nextPaymentStatus === 'no_payment_required')
    && !base.paidAt;
  const isDuplicateEvent = base.lastEventId === snapshot.eventId && Boolean(snapshot.eventId);
  const nextLogs = isDuplicateEvent
    ? base.logs
    : [
        createOrderLog('Stripe Webhook', 'stripe.com', buildWebhookAction(snapshot), snapshot.processedAt),
        ...base.logs,
      ];

  return {
    ...base,
    stripeSessionId: snapshot.sessionId || base.stripeSessionId,
    stripePaymentIntentId: snapshot.paymentIntentId || base.stripePaymentIntentId,
    mode: snapshot.mode || base.mode,
    sessionStatus: nextSessionStatus,
    paymentStatus: nextPaymentStatus,
    orderStatus: nextOrderStatus,
    currency: normalizeCurrency(snapshot.currency || base.currency),
    total: snapshot.amountTotal ?? base.total,
    updatedAt: snapshot.processedAt,
    paidAt: becamePaid ? snapshot.processedAt : base.paidAt,
    lastEventId: snapshot.eventId,
    lastEventType: snapshot.eventType,
    logs: nextLogs,
  };
}

function applyAdminStatusToOrder(
  current: TrackedStripeOrderRecord,
  nextStatus: TrackedOrderStatus,
  user: string,
  ip: string,
) {
  const base = ensureTrackedOrderDefaults(current);
  const now = new Date().toISOString();

  if (base.orderStatus === nextStatus) {
    return base;
  }

  return {
    ...base,
    orderStatus: nextStatus,
    paymentStatus:
      normalizeStatusKey(nextStatus) === 'pago'
        ? 'paid'
        : base.paymentStatus,
    updatedAt: now,
    paidAt:
      normalizeStatusKey(nextStatus) === 'pago' && !base.paidAt
        ? now
        : base.paidAt,
    shippedAt:
      normalizeStatusKey(nextStatus) === 'enviado' && !base.shippedAt
        ? now
        : base.shippedAt,
    deliveredAt:
      normalizeStatusKey(nextStatus) === 'entregue' && !base.deliveredAt
        ? now
        : base.deliveredAt,
    logs: [
      createOrderLog(user, ip, `Status alterado para ${nextStatus}`, now),
      ...base.logs,
    ],
  };
}

function mapOrderRow(row: any): TrackedStripeOrderRecord {
  return ensureTrackedOrderDefaults({
    provider: 'stripe',
    orderNumber: row.order_number,
    stripeSessionId: row.stripe_session_id || '',
    stripePaymentIntentId: row.stripe_payment_intent_id || '',
    mode: row.mode === 'live' ? 'live' : 'test',
    sessionStatus: row.session_status || 'open',
    paymentStatus: row.payment_status || 'unpaid',
    orderStatus: row.order_status || 'Aguardando Pagamento',
    currency: row.currency || 'USD',
    subtotal: Number(row.subtotal || 0),
    shipping: Number(row.shipping || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    shippingMethod: row.shipping_method || '',
    paymentMethod: row.payment_method || 'Stripe Checkout',
    customer: parseJsonValue(row.customer, {}),
    shippingAddress: parseJsonValue(row.shipping_address, {}),
    items: parseJsonValue(row.items, []),
    source: row.source || 'stripe_checkout',
    metadata: parseJsonValue(row.metadata, {}),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    paidAt: row.paid_at || null,
    shippedAt: row.shipped_at || null,
    deliveredAt: row.delivered_at || null,
    lastEventId: row.last_event_id || '',
    lastEventType: row.last_event_type || '',
    logs: parseJsonValue(row.logs, []),
  });
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
        payment_method: record.paymentMethod,
        customer: record.customer,
        shipping_address: record.shippingAddress,
        items: record.items,
        source: record.source,
        metadata: record.metadata,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        paid_at: record.paidAt,
        shipped_at: record.shippedAt,
        delivered_at: record.deliveredAt,
        last_event_id: record.lastEventId,
        last_event_type: record.lastEventType,
        logs: record.logs,
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

async function listSupabaseTrackedOrders() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('stripe_checkout_orders')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapOrderRow);
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

function sortTrackedOrders(records: TrackedStripeOrderRecord[]) {
  return [...records].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function toTrackedAdminOrder(record: TrackedStripeOrderRecord): StripeTrackedAdminOrder {
  const safeCustomer = record.customer || {};
  const safeAddress = record.shippingAddress || {};

  return {
    id: `stripe-${(record.orderNumber || record.stripeSessionId || randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()}`,
    orderNumber: record.orderNumber,
    purchaseDate: record.createdAt,
    status: record.orderStatus,
    total: Number(record.total || 0),
    paymentMethod: record.paymentMethod || 'Stripe Checkout',
    paymentStatus: record.paymentStatus,
    sessionStatus: record.sessionStatus,
    stripeMode: record.mode,
    source: 'stripe-server',
    customer: {
      documentLabel: safeString((safeCustomer as CheckoutCustomerPayload).documentLabel),
      name: safeString((safeCustomer as CheckoutCustomerPayload).name),
      email: safeString((safeCustomer as CheckoutCustomerPayload).email),
      phone: safeString((safeCustomer as CheckoutCustomerPayload).phone),
      phoneCountry: safeString((safeCustomer as CheckoutCustomerPayload).phoneCountry) || undefined,
      phoneE164: safeString((safeCustomer as any).phoneE164) || undefined,
      cpf: safeString((safeCustomer as CheckoutCustomerPayload).cpf) || undefined,
    },
    shippingAddress: {
      country: safeString((safeAddress as CheckoutShippingAddressPayload).country) || undefined,
      cep: safeString((safeAddress as CheckoutShippingAddressPayload).postalCode),
      street: safeString((safeAddress as CheckoutShippingAddressPayload).street),
      number: safeString((safeAddress as CheckoutShippingAddressPayload).number),
      complement: safeString((safeAddress as CheckoutShippingAddressPayload).complement) || undefined,
      district: safeString((safeAddress as CheckoutShippingAddressPayload).neighborhood),
      city: safeString((safeAddress as CheckoutShippingAddressPayload).city),
      state: safeString((safeAddress as CheckoutShippingAddressPayload).region),
    },
    items: (Array.isArray(record.items) ? record.items : []).map((item) => ({
      id: item.id,
      name: item.name,
      sku: buildItemSku(item),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      subtotal: Number(item.unitPrice || 0) * Number(item.quantity || 0),
    })),
    subtotal: Number(record.subtotal || 0),
    shipping: Number(record.shipping || 0),
    discount: Number(record.discount || 0),
    history: {
      createdAt: record.createdAt,
      paidAt: record.paidAt || undefined,
      shippedAt: record.shippedAt || undefined,
      deliveredAt: record.deliveredAt || undefined,
    },
    logs: [...record.logs].sort(
      (left, right) => new Date(right.dateTime).getTime() - new Date(left.dateTime).getTime(),
    ),
  };
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

export async function listTrackedStripeAdminOrders() {
  const backend = resolveTrackingBackend();
  const records = backend === 'supabase'
    ? await listSupabaseTrackedOrders()
    : sortTrackedOrders((await readFileStore()).orders.map((record) => ensureTrackedOrderDefaults(record)));

  return {
    backend,
    orders: records.map(toTrackedAdminOrder),
    success: true as const,
    timestamp: new Date().toISOString(),
  };
}

export async function updateTrackedStripeOrderStatus(
  orderNumber: string,
  nextStatus: TrackedOrderStatus,
  user: string,
  ip: string,
) {
  const backend = resolveTrackingBackend();

  if (backend === 'supabase') {
    const current = await getSupabaseOrderByLookup(orderNumber, '');

    if (!current) {
      throw new Error('Pedido Stripe nao encontrado.');
    }

    const next = applyAdminStatusToOrder(current, nextStatus, user, ip);
    await persistOrderInSupabase(next);
    return toTrackedAdminOrder(next);
  }

  const store = await readFileStore();
  const current = store.orders.find((item) => item.orderNumber === orderNumber) || null;

  if (!current) {
    throw new Error('Pedido Stripe nao encontrado.');
  }

  const next = applyAdminStatusToOrder(current, nextStatus, user, ip);
  const nextOrders = [
    next,
    ...store.orders.filter((item) => item.orderNumber !== orderNumber),
  ];

  await writeFileStore({
    ...store,
    orders: nextOrders,
  });

  return toTrackedAdminOrder(next);
}
