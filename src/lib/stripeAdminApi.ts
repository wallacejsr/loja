import type { StripeMode } from '../types/settings';
import { getIntegrationsApiBaseUrl } from './storeBackend';

export type StripeModeCredentialState = {
  effective: {
    publishableKey: boolean;
    ready: boolean;
    secretKey: boolean;
    source: 'database' | 'environment' | 'missing';
    webhookSecret: boolean;
  };
  environment: {
    publishableKey: boolean;
    ready: boolean;
    secretKey: boolean;
    webhookSecret: boolean;
  };
  stored: {
    mode: StripeMode;
    publishableKeyConfigured: boolean;
    publishableKeyMasked: string;
    ready: boolean;
    secretKeyConfigured: boolean;
    secretKeyMasked: string;
    updatedAt: string | null;
    webhookSecretConfigured: boolean;
    webhookSecretMasked: string;
  };
};

export type StripeStatusResponse = {
  backend: 'repository' | 'supabase';
  encryptionReady: boolean;
  modes: Record<StripeMode, StripeModeCredentialState>;
  provider: 'stripe';
  storageError: string | null;
  success: true;
  timestamp: string;
};

export type StripeCredentialSaveResponse = {
  message: string;
  provider: 'stripe';
  saved: StripeStatusResponse['modes'][StripeMode]['stored'];
  status: StripeStatusResponse;
  success: boolean;
  timestamp: string;
};

export type StripeConnectionTestResponse = {
  accountId: string;
  businessName: string;
  chargesEnabled: boolean;
  country: string;
  currency: string;
  detailsSubmitted: boolean;
  livemode: boolean;
  mode: StripeMode;
  modeMatchesSelection: boolean;
  provider: 'stripe';
  secretSource: 'database' | 'environment' | 'missing';
  success: true;
  timestamp: string;
};

export type StripeTrackedOrderStatus =
  | 'Aguardando Pagamento'
  | 'Pago'
  | 'Em Separacao'
  | 'Em Separação'
  | 'Em SeparaÃ§Ã£o'
  | 'Enviado'
  | 'Entregue'
  | 'Cancelado';

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
    country?: string;
    district: string;
    number: string;
    state: string;
    street: string;
  };
  source: 'stripe-server';
  status: StripeTrackedOrderStatus;
  stripeMode: StripeMode;
  subtotal: number;
  total: number;
};

export type StripeTrackedOrdersResponse = {
  backend: 'file' | 'supabase';
  orders: StripeTrackedAdminOrder[];
  success: true;
  timestamp: string;
};

export type StripeTrackedOrderStatusUpdateResponse = {
  order: StripeTrackedAdminOrder;
  success: true;
  timestamp: string;
};

export type SaveStripeCredentialsInput = {
  mode: StripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
};

async function requestStripeAdminApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildStripeAdminApiUrl(path), {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  const payload = await response.clone().json().catch(() => null);
  const rawText = payload ? '' : await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(
      typeof payload?.message === 'string'
        ? payload.message
        : rawText.trim()
          ? rawText.trim().slice(0, 220)
        : `Falha ao acessar a integracao Stripe (${response.status}).`,
    );
  }

  return (payload || {}) as T;
}

function buildStripeAdminApiUrl(path: string) {
  return new URL(`${getIntegrationsApiBaseUrl()}${path}`, window.location.origin).toString();
}

export async function getStripeStatus() {
  return requestStripeAdminApi<StripeStatusResponse>('/stripe/status');
}

export async function saveStripeCredentials(input: SaveStripeCredentialsInput) {
  return requestStripeAdminApi<StripeCredentialSaveResponse>('/stripe/credentials', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function testStripeConnection(mode: StripeMode) {
  return requestStripeAdminApi<StripeConnectionTestResponse>('/stripe/test-connection', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

export async function getStripeTrackedOrders() {
  return requestStripeAdminApi<StripeTrackedOrdersResponse>('/stripe/admin/orders');
}

export async function updateStripeTrackedOrderStatus(orderNumber: string, status: StripeTrackedOrderStatus, user = 'Admin Loja') {
  return requestStripeAdminApi<StripeTrackedOrderStatusUpdateResponse>('/stripe/admin/order-status', {
    method: 'PATCH',
    body: JSON.stringify({
      orderNumber,
      status,
      user,
    }),
  });
}
