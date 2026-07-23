import { randomUUID } from 'node:crypto';
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
  | 'Em SeparaÃ§Ã£o'
  | 'Em SeparaÃƒÂ§ÃƒÂ£o'
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

export type StripeTrackingBackend = 'mariadb';

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

type OfficialOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

let cachedMariaDbPool: any = null;

export function resolveTrackingBackend(): StripeTrackingBackend {
  return 'mariadb';
}
async function loadMariaDbModule() {
  const moduleName = 'mysql2/promise';

  try {
    return await import(moduleName);
  } catch (error) {
    throw new Error(
      'O driver mysql2 nao esta instalado. Rode "npm install mysql2" antes de usar MariaDB no tracking Stripe.',
      { cause: error },
    );
  }
}

async function getMariaDbPool() {
  if (cachedMariaDbPool) {
    return cachedMariaDbPool;
  }

  const requiredVariables = ['MARIADB_HOST', 'MARIADB_DATABASE', 'MARIADB_USER', 'MARIADB_PASSWORD'];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

  if (missingVariables.length > 0) {
    throw new Error(`MariaDB Stripe tracking is missing: ${missingVariables.join(', ')}.`);
  }

  const mysql = await loadMariaDbModule();
  cachedMariaDbPool = mysql.createPool({
    host: process.env.MARIADB_HOST,
    port: Number(process.env.MARIADB_PORT || 3306),
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT || 10),
    charset: 'utf8mb4',
    namedPlaceholders: false,
    multipleStatements: false,
  });

  return cachedMariaDbPool;
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

function toSqlDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
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

function toOfficialOrderStatus(status: TrackedOrderStatus): OfficialOrderStatus {
  switch (normalizeStatusKey(status)) {
    case 'pago':
      return 'paid';
    case 'em separacao':
      return 'processing';
    case 'enviado':
      return 'shipped';
    case 'entregue':
      return 'delivered';
    case 'cancelado':
      return 'cancelled';
    default:
      return 'pending_payment';
  }
}

function buildOfficialOrderId(orderNumber: string) {
  return `order-${orderNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
}

function getTrackedCustomerEmail(record: TrackedStripeOrderRecord) {
  return safeString((record.customer as CheckoutCustomerPayload | undefined)?.email).trim().toLowerCase();
}

async function resolveMariaDbCustomerId(connection: any, email: string) {
  if (!email) {
    return null;
  }

  const [rows] = await connection.query(
    'SELECT id FROM customers WHERE email = ? LIMIT 1',
    [email],
  );
  const row = (rows as any[])[0];
  return row?.id ? String(row.id) : null;
}

async function persistOfficialOrderInMariaDb(record: TrackedStripeOrderRecord) {
  const pool = await getMariaDbPool();
  const orderId = buildOfficialOrderId(record.orderNumber);
  const now = record.updatedAt || new Date().toISOString();
  const placedAt = record.paidAt || record.createdAt || now;
  const status = toOfficialOrderStatus(record.orderStatus);
  const shippingAddressSnapshot = record.shippingAddress || {};
  const billingAddressSnapshot = record.shippingAddress || {};

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const customerId = await resolveMariaDbCustomerId(connection, getTrackedCustomerEmail(record));

    await connection.query(
      `
        INSERT INTO orders (
          id, order_number, customer_id, cart_id, source, status, payment_provider,
          payment_method, payment_reference, currency, subtotal, discount, shipping, tax,
          total, coupon_id, customer_benefit_id, customer_snapshot, billing_address_snapshot,
          shipping_address_snapshot, metadata, placed_at, paid_at, shipped_at, delivered_at,
          cancelled_at, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          source = VALUES(source),
          status = VALUES(status),
          payment_provider = VALUES(payment_provider),
          payment_method = VALUES(payment_method),
          payment_reference = VALUES(payment_reference),
          currency = VALUES(currency),
          subtotal = VALUES(subtotal),
          discount = VALUES(discount),
          shipping = VALUES(shipping),
          tax = VALUES(tax),
          total = VALUES(total),
          customer_snapshot = VALUES(customer_snapshot),
          billing_address_snapshot = VALUES(billing_address_snapshot),
          shipping_address_snapshot = VALUES(shipping_address_snapshot),
          metadata = VALUES(metadata),
          placed_at = VALUES(placed_at),
          paid_at = VALUES(paid_at),
          shipped_at = VALUES(shipped_at),
          delivered_at = VALUES(delivered_at),
          cancelled_at = VALUES(cancelled_at),
          updated_at = VALUES(updated_at)
      `,
      [
        orderId,
        record.orderNumber,
        customerId,
        record.source || 'stripe_checkout',
        status,
        'stripe',
        record.paymentMethod || 'Stripe Checkout',
        record.stripeSessionId || record.stripePaymentIntentId || '',
        normalizeCurrency(record.currency),
        Number(record.subtotal || 0),
        Number(record.discount || 0),
        Number(record.shipping || 0),
        0,
        Number(record.total || 0),
        JSON.stringify(record.customer || {}),
        JSON.stringify(billingAddressSnapshot),
        JSON.stringify(shippingAddressSnapshot),
        JSON.stringify({
          mode: record.mode,
          source: record.source,
          status: record.orderStatus,
          paymentStatus: record.paymentStatus,
          sessionStatus: record.sessionStatus,
          lastEventId: record.lastEventId,
          lastEventType: record.lastEventType,
        }),
        toSqlDateTime(placedAt),
        toSqlDateTime(record.paidAt || null),
        toSqlDateTime(record.shippedAt || null),
        toSqlDateTime(record.deliveredAt || null),
        toSqlDateTime(normalizeStatusKey(record.orderStatus) === 'cancelado' ? record.updatedAt : null),
        toSqlDateTime(record.createdAt),
        toSqlDateTime(now),
      ],
    );

    await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of Array.isArray(record.items) ? record.items : []) {
      await connection.query(
        `
          INSERT INTO order_items (
            id, order_id, product_id, product_name_snapshot, sku_snapshot,
            unit_price, quantity, subtotal, size_label, color_label, metadata,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          orderId,
          item.id,
          item.name,
          buildItemSku(item),
          Number(item.unitPrice || 0),
          Number(item.quantity || 0),
          Number(item.unitPrice || 0) * Number(item.quantity || 0),
          item.size || '',
          item.color || '',
          JSON.stringify({
            source: record.source,
            stripeOrderNumber: record.orderNumber,
          }),
          toSqlDateTime(record.createdAt),
          toSqlDateTime(now),
        ],
      );
    }

    await connection.query('DELETE FROM order_status_logs WHERE order_id = ?', [orderId]);
    for (const log of Array.isArray(record.logs) ? record.logs : []) {
      await connection.query(
        `
          INSERT INTO order_status_logs (
            id, order_id, status, actor_type, actor_id, actor_name, ip_address, message, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          log.id || randomUUID(),
          orderId,
          status,
          normalizeStatusKey(log.user) === 'stripe webhook' || normalizeStatusKey(log.user) === 'stripe checkout' || normalizeStatusKey(log.user) === 'sistema'
            ? 'system'
            : 'admin',
          '',
          log.user || 'System',
          log.ip || '',
          log.action || '',
          JSON.stringify({
            source: record.source,
            paymentStatus: record.paymentStatus,
            sessionStatus: record.sessionStatus,
          }),
          toSqlDateTime(log.dateTime),
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

async function persistOrderInMariaDb(record: TrackedStripeOrderRecord) {
  const pool = await getMariaDbPool();
  await pool.query(
    `INSERT INTO stripe_checkout_orders (
      order_number,
      stripe_session_id,
      stripe_payment_intent_id,
      provider,
      mode,
      session_status,
      payment_status,
      order_status,
      currency,
      subtotal,
      shipping,
      discount,
      total,
      shipping_method,
      payment_method,
      customer,
      shipping_address,
      items,
      source,
      metadata,
      created_at,
      updated_at,
      paid_at,
      shipped_at,
      delivered_at,
      last_event_id,
      last_event_type,
      logs
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      stripe_session_id = VALUES(stripe_session_id),
      stripe_payment_intent_id = VALUES(stripe_payment_intent_id),
      provider = VALUES(provider),
      mode = VALUES(mode),
      session_status = VALUES(session_status),
      payment_status = VALUES(payment_status),
      order_status = VALUES(order_status),
      currency = VALUES(currency),
      subtotal = VALUES(subtotal),
      shipping = VALUES(shipping),
      discount = VALUES(discount),
      total = VALUES(total),
      shipping_method = VALUES(shipping_method),
      payment_method = VALUES(payment_method),
      customer = VALUES(customer),
      shipping_address = VALUES(shipping_address),
      items = VALUES(items),
      source = VALUES(source),
      metadata = VALUES(metadata),
      created_at = VALUES(created_at),
      updated_at = VALUES(updated_at),
      paid_at = VALUES(paid_at),
      shipped_at = VALUES(shipped_at),
      delivered_at = VALUES(delivered_at),
      last_event_id = VALUES(last_event_id),
      last_event_type = VALUES(last_event_type),
      logs = VALUES(logs)`,
    [
      record.orderNumber,
      record.stripeSessionId,
      record.stripePaymentIntentId,
      record.provider,
      record.mode,
      record.sessionStatus,
      record.paymentStatus,
      record.orderStatus,
      record.currency,
      record.subtotal,
      record.shipping,
      record.discount,
      record.total,
      record.shippingMethod,
      record.paymentMethod,
      JSON.stringify(record.customer || {}),
      JSON.stringify(record.shippingAddress || {}),
      JSON.stringify(record.items || []),
      record.source,
      JSON.stringify(record.metadata || {}),
      record.createdAt,
      record.updatedAt,
      record.paidAt,
      record.shippedAt,
      record.deliveredAt,
      record.lastEventId,
      record.lastEventType,
      JSON.stringify(record.logs || []),
    ],
  );
}

async function getMariaDbOrderByLookup(orderNumber: string, sessionId: string) {
  const pool = await getMariaDbPool();

  if (orderNumber) {
    const [rows] = await pool.query(
      'SELECT * FROM stripe_checkout_orders WHERE order_number = ? LIMIT 1',
      [orderNumber],
    );
    const row = (rows as any[])[0];
    if (row) {
      return mapOrderRow(row);
    }
  }

  if (!sessionId) {
    return null;
  }

  const [rows] = await pool.query(
    'SELECT * FROM stripe_checkout_orders WHERE stripe_session_id = ? LIMIT 1',
    [sessionId],
  );

  const row = (rows as any[])[0];
  return row ? mapOrderRow(row) : null;
}

async function listMariaDbTrackedOrders() {
  const pool = await getMariaDbPool();
  const [rows] = await pool.query(
    'SELECT * FROM stripe_checkout_orders ORDER BY updated_at DESC',
  );

  return (rows as any[]).map(mapOrderRow);
}

async function persistWebhookLogInMariaDb(record: StripeWebhookLogRecord) {
  const pool = await getMariaDbPool();
  await pool.query(
    `INSERT INTO stripe_webhook_logs (
      event_id,
      event_type,
      order_number,
      stripe_session_id,
      livemode,
      status,
      message,
      payload,
      processed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      event_type = VALUES(event_type),
      order_number = VALUES(order_number),
      stripe_session_id = VALUES(stripe_session_id),
      livemode = VALUES(livemode),
      status = VALUES(status),
      message = VALUES(message),
      payload = VALUES(payload),
      processed_at = VALUES(processed_at)`,
    [
      record.eventId,
      record.eventType,
      record.orderNumber,
      record.stripeSessionId,
      record.livemode ? 1 : 0,
      record.status,
      record.message,
      JSON.stringify(record.payload || {}),
      record.processedAt,
    ],
  );
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
  await persistOrderInMariaDb(record);
  await persistOfficialOrderInMariaDb(record);
}

export async function getTrackedStripeOrderByLookup(orderNumber: string, sessionId = '') {
  const current = await getMariaDbOrderByLookup(orderNumber, sessionId);
  return current ? toTrackedAdminOrder(current) : null;
}

export async function persistStripeWebhookLog(record: StripeWebhookLogRecord) {
  await persistWebhookLogInMariaDb(record);
}

export async function applyStripeWebhookSessionSnapshot(snapshot: StripeWebhookSessionSnapshot) {
  const current = await getMariaDbOrderByLookup(snapshot.orderNumber, snapshot.sessionId);
  const next = applySessionSnapshotToOrder(current, snapshot);
  await persistOrderInMariaDb(next);
  await persistOfficialOrderInMariaDb(next);
  return next;
}

export async function listTrackedStripeAdminOrders() {
  const backend = resolveTrackingBackend();
  const records = await listMariaDbTrackedOrders();

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
  const current = await getMariaDbOrderByLookup(orderNumber, '');

  if (!current) {
    throw new Error('Pedido Stripe nao encontrado.');
  }

  const next = applyAdminStatusToOrder(current, nextStatus, user, ip);
  await persistOrderInMariaDb(next);
  await persistOfficialOrderInMariaDb(next);
  return toTrackedAdminOrder(next);
}
