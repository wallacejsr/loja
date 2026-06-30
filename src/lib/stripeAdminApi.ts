import type { StripeMode } from '../types/settings';

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

export type SaveStripeCredentialsInput = {
  mode: StripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
};

async function requestStripeAdminApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
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

export async function getStripeStatus() {
  return requestStripeAdminApi<StripeStatusResponse>('/api/integrations/stripe/status');
}

export async function saveStripeCredentials(input: SaveStripeCredentialsInput) {
  return requestStripeAdminApi<StripeCredentialSaveResponse>('/api/integrations/stripe/credentials', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function testStripeConnection(mode: StripeMode) {
  return requestStripeAdminApi<StripeConnectionTestResponse>('/api/integrations/stripe/test-connection', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}
