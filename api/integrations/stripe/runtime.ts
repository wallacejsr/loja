import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { StripeMode } from '../../../src/types/settings.js';

type ResolvedStripeStorageBackend = 'repository' | 'supabase';

type StoredStripeCredentialSet = {
  publishableKeyEncrypted: string;
  secretKeyEncrypted: string;
  updatedAt: string | null;
  webhookSecretEncrypted: string;
};

type StripeCredentialInput = {
  mode: StripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
};

type StripeCredentialSummary = {
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

type StripeCredentials = {
  mode: StripeMode;
  publishableKey: string;
  secretKey: string;
  updatedAt: string | null;
  webhookSecret: string;
};

type StoreRepositoryLike = {
  getStripeCredentials: (mode: StripeMode) => Promise<StripeCredentials | null>;
  listStripeCredentialSummaries: () => Promise<Record<StripeMode, StripeCredentialSummary>>;
  saveStripeCredentials: (input: StripeCredentialInput) => Promise<StripeCredentialSummary>;
};

type StripeModePresence = {
  publishableKey: boolean;
  ready: boolean;
  secretKey: boolean;
  webhookSecret: boolean;
};

type EffectiveStripeModePresence = StripeModePresence & {
  source: 'database' | 'environment' | 'missing';
};

export type StripeStatusPayload = {
  backend: ResolvedStripeStorageBackend;
  encryptionReady: boolean;
  modes: Record<
    StripeMode,
    {
      effective: EffectiveStripeModePresence;
      environment: StripeModePresence;
      stored: StripeCredentialSummary;
    }
  >;
  provider: 'stripe';
  storageError: string | null;
  success: true;
  timestamp: string;
};

export type StripeConnectionTestPayload = {
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

let cachedRepositoryPromise: Promise<StoreRepositoryLike> | null = null;
let cachedSupabaseClient: SupabaseClient | null = null;

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

const ENCRYPTION_VERSION = 'v1';

function buildModePresence(status: Omit<StripeModePresence, 'ready'>): StripeModePresence {
  return {
    ...status,
    ready: status.publishableKey && status.secretKey && status.webhookSecret,
  };
}

function getConfiguredEncryptionSecret() {
  return (
    process.env.APP_SECRETS_ENCRYPTION_KEY?.trim()
    || process.env.STORE_SECRETS_ENCRYPTION_KEY?.trim()
    || ''
  );
}

function hasStripeCredentialEncryption() {
  return Boolean(getConfiguredEncryptionSecret());
}

async function getStoreRepository() {
  if (!cachedRepositoryPromise) {
    cachedRepositoryPromise = import('../../../server/store/repository.js')
      .then((module) => module.createStoreRepository()) as Promise<StoreRepositoryLike>;
  }

  return cachedRepositoryPromise;
}

function createEmptyStoredStripeCredentialSet(): StoredStripeCredentialSet {
  return {
    publishableKeyEncrypted: '',
    secretKeyEncrypted: '',
    webhookSecretEncrypted: '',
    updatedAt: null,
  };
}

function hasStoredValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function encodeBinary(buffer: Buffer) {
  return buffer.toString('base64url');
}

function decodeBinary(value: string) {
  return Buffer.from(value, 'base64url');
}

async function encryptStoredSecret(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const { createCipheriv, createHash, randomBytes } = await import('node:crypto');
  const secret = getConfiguredEncryptionSecret();

  if (!secret) {
    throw new Error(
      'Configure APP_SECRETS_ENCRYPTION_KEY para salvar credenciais privadas da Stripe no banco.',
    );
  }

  const iv = randomBytes(12);
  const key = createHash('sha256').update(secret).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_VERSION}:${encodeBinary(iv)}:${encodeBinary(authTag)}:${encodeBinary(encrypted)}`;
}

async function decryptStoredSecret(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (!trimmed.startsWith(`${ENCRYPTION_VERSION}:`)) {
    return trimmed;
  }

  const parts = trimmed.split(':');

  if (parts.length !== 4) {
    throw new Error('Formato invalido de credencial criptografada da Stripe.');
  }

  const { createDecipheriv, createHash } = await import('node:crypto');
  const secret = getConfiguredEncryptionSecret();

  if (!secret) {
    throw new Error(
      'Configure APP_SECRETS_ENCRYPTION_KEY para ler credenciais privadas da Stripe no banco.',
    );
  }

  const [, encodedIv, encodedTag, encodedPayload] = parts;
  const key = createHash('sha256').update(secret).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, decodeBinary(encodedIv));
  decipher.setAuthTag(decodeBinary(encodedTag));

  const decrypted = Buffer.concat([
    decipher.update(decodeBinary(encodedPayload)),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function maskPlainSecret(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****`;
  }

  return `${trimmed.slice(0, 6)}****${trimmed.slice(-4)}`;
}

async function maskStoredSecret(value: string) {
  if (!hasStoredValue(value)) {
    return '';
  }

  try {
    return maskPlainSecret(await decryptStoredSecret(value));
  } catch {
    return 'Configurada';
  }
}

async function buildStripeCredentialSummary(
  mode: StripeMode,
  stored: StoredStripeCredentialSet | null | undefined,
): Promise<StripeCredentialSummary> {
  const source = stored || createEmptyStoredStripeCredentialSet();
  const publishableKeyConfigured = hasStoredValue(source.publishableKeyEncrypted);
  const secretKeyConfigured = hasStoredValue(source.secretKeyEncrypted);
  const webhookSecretConfigured = hasStoredValue(source.webhookSecretEncrypted);

  return {
    mode,
    publishableKeyConfigured,
    publishableKeyMasked: await maskStoredSecret(source.publishableKeyEncrypted),
    secretKeyConfigured,
    secretKeyMasked: await maskStoredSecret(source.secretKeyEncrypted),
    webhookSecretConfigured,
    webhookSecretMasked: await maskStoredSecret(source.webhookSecretEncrypted),
    updatedAt: source.updatedAt || null,
    ready: publishableKeyConfigured && secretKeyConfigured && webhookSecretConfigured,
  };
}

async function applyStripeCredentialInput(
  current: StoredStripeCredentialSet | null | undefined,
  input: StripeCredentialInput,
): Promise<StoredStripeCredentialSet> {
  const base = current || createEmptyStoredStripeCredentialSet();
  const next: StoredStripeCredentialSet = {
    publishableKeyEncrypted: base.publishableKeyEncrypted,
    secretKeyEncrypted: base.secretKeyEncrypted,
    webhookSecretEncrypted: base.webhookSecretEncrypted,
    updatedAt: base.updatedAt,
  };

  const nextPublishableKey = input.publishableKey?.trim() || '';
  const nextSecretKey = input.secretKey?.trim() || '';
  const nextWebhookSecret = input.webhookSecret?.trim() || '';
  let hasChanged = false;

  if (nextPublishableKey) {
    next.publishableKeyEncrypted = await encryptStoredSecret(nextPublishableKey);
    hasChanged = true;
  }

  if (nextSecretKey) {
    next.secretKeyEncrypted = await encryptStoredSecret(nextSecretKey);
    hasChanged = true;
  }

  if (nextWebhookSecret) {
    next.webhookSecretEncrypted = await encryptStoredSecret(nextWebhookSecret);
    hasChanged = true;
  }

  if (hasChanged) {
    next.updatedAt = new Date().toISOString();
  }

  return next;
}

async function decodeStoredStripeCredentials(
  mode: StripeMode,
  stored: StoredStripeCredentialSet | null | undefined,
): Promise<StripeCredentials | null> {
  const source = stored || createEmptyStoredStripeCredentialSet();
  const hasAnyCredential =
    hasStoredValue(source.publishableKeyEncrypted)
    || hasStoredValue(source.secretKeyEncrypted)
    || hasStoredValue(source.webhookSecretEncrypted);

  if (!hasAnyCredential) {
    return null;
  }

  return {
    mode,
    publishableKey: await decryptStoredSecret(source.publishableKeyEncrypted),
    secretKey: await decryptStoredSecret(source.secretKeyEncrypted),
    webhookSecret: await decryptStoredSecret(source.webhookSecretEncrypted),
    updatedAt: source.updatedAt || null,
  };
}

function getConfiguredSupabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim()
    || process.env.VITE_SUPABASE_URL?.trim()
    || ''
  );
}

function getConfiguredSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

function getConfiguredStoreBackend() {
  const backend = (process.env.STORE_DATA_BACKEND?.trim()
    || process.env.VITE_STORE_BACKEND?.trim()
    || '')
    .toLowerCase();

  return backend === 'rest' || backend === 'supabase' || backend === 'local'
    ? backend
    : '';
}

function resolveStripeStorageBackend(): ResolvedStripeStorageBackend {
  const explicitBackend = getConfiguredStoreBackend();

  if (explicitBackend === 'rest' || explicitBackend === 'local') {
    return 'repository';
  }

  if (explicitBackend === 'supabase') {
    return 'supabase';
  }

  if (
    hasValue(process.env.STORE_DATA_DRIVER)
    || hasValue(process.env.STORE_DATA_FILE_PATH)
    || hasValue(process.env.MARIADB_DATABASE)
    || hasValue(process.env.MARIADB_HOST)
  ) {
    return 'repository';
  }

  if (hasValue(getConfiguredSupabaseUrl())) {
    return 'supabase';
  }

  return 'repository';
}

function getSupabaseServerClient() {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }

  const url = getConfiguredSupabaseUrl();
  const key = getConfiguredSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para ler credenciais privadas da Stripe no Supabase.',
    );
  }

  cachedSupabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabaseClient;
}

function readEnvironmentModeStatus(mode: StripeMode): StripeModePresence {
  const prefix = `STRIPE_${mode.toUpperCase()}`;

  return buildModePresence({
    publishableKey:
      hasValue(process.env[`${prefix}_PUBLISHABLE_KEY`])
      || hasValue(process.env[`NEXT_PUBLIC_${prefix}_PUBLISHABLE_KEY`])
      || hasValue(process.env[`VITE_${prefix}_PUBLISHABLE_KEY`]),
    secretKey: hasValue(process.env[`${prefix}_SECRET_KEY`]) || hasValue(process.env.STRIPE_SECRET_KEY),
    webhookSecret: hasValue(process.env[`${prefix}_WEBHOOK_SECRET`]) || hasValue(process.env.STRIPE_WEBHOOK_SECRET),
  });
}

function mapSupabaseStoredCredentialSet(row: any): StoredStripeCredentialSet {
  return {
    publishableKeyEncrypted: row?.publishable_key_encrypted || '',
    secretKeyEncrypted: row?.secret_key_encrypted || '',
    webhookSecretEncrypted: row?.webhook_secret_encrypted || '',
    updatedAt: row?.updated_at || null,
  };
}

async function getSupabaseStoredStripeCredentialSet(mode: StripeMode) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('payment_gateway_credentials')
    .select('publishable_key_encrypted, secret_key_encrypted, webhook_secret_encrypted, updated_at')
    .eq('provider', 'stripe')
    .eq('mode', mode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data
    ? mapSupabaseStoredCredentialSet(data)
    : createEmptyStoredStripeCredentialSet();
}

async function listSupabaseStoredStripeCredentialSets() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('payment_gateway_credentials')
    .select('mode, publishable_key_encrypted, secret_key_encrypted, webhook_secret_encrypted, updated_at')
    .eq('provider', 'stripe')
    .in('mode', ['test', 'live']);

  if (error) {
    throw new Error(error.message);
  }

  const mapped = {
    test: createEmptyStoredStripeCredentialSet(),
    live: createEmptyStoredStripeCredentialSet(),
  } satisfies Record<StripeMode, StoredStripeCredentialSet>;

  for (const row of data || []) {
    const mode = row.mode === 'live' ? 'live' : 'test';
    mapped[mode] = mapSupabaseStoredCredentialSet(row);
  }

  return mapped;
}

async function saveSupabaseStripeCredentials(input: StripeCredentialInput) {
  const current = await getSupabaseStoredStripeCredentialSet(input.mode);
  const next = await applyStripeCredentialInput(current, input);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('payment_gateway_credentials')
    .upsert(
      {
        provider: 'stripe',
        mode: input.mode,
        publishable_key_encrypted: next.publishableKeyEncrypted,
        secret_key_encrypted: next.secretKeyEncrypted,
        webhook_secret_encrypted: next.webhookSecretEncrypted,
        updated_at: next.updatedAt || new Date().toISOString(),
      },
      {
        onConflict: 'provider,mode',
      },
    );

  if (error) {
    throw new Error(error.message);
  }

  return buildStripeCredentialSummary(input.mode, next);
}

function buildEffectiveStatus(stored: StripeCredentialSummary, environment: StripeModePresence): EffectiveStripeModePresence {
  if (stored.ready) {
    return {
      publishableKey: stored.publishableKeyConfigured,
      secretKey: stored.secretKeyConfigured,
      webhookSecret: stored.webhookSecretConfigured,
      ready: stored.ready,
      source: 'database',
    };
  }

  if (environment.publishableKey || environment.secretKey || environment.webhookSecret) {
    return {
      ...environment,
      source: 'environment',
    };
  }

  return {
    publishableKey: false,
    secretKey: false,
    webhookSecret: false,
    ready: false,
    source: 'missing',
  };
}

export async function getStripeStatusPayload(): Promise<StripeStatusPayload> {
  const backend = resolveStripeStorageBackend();
  let storageError: string | null = null;
  let storedModes: Record<StripeMode, StripeCredentialSummary>;

  try {
    if (backend === 'repository') {
      const repository = await getStoreRepository();
      storedModes = await repository.listStripeCredentialSummaries();
    } else {
      const stored = await listSupabaseStoredStripeCredentialSets();
      storedModes = {
        test: await buildStripeCredentialSummary('test', stored.test),
        live: await buildStripeCredentialSummary('live', stored.live),
      };
    }
  } catch (error) {
    storageError = error instanceof Error ? error.message : 'Nao foi possivel ler as credenciais privadas da Stripe.';
    storedModes = {
      test: await buildStripeCredentialSummary('test', createEmptyStoredStripeCredentialSet()),
      live: await buildStripeCredentialSummary('live', createEmptyStoredStripeCredentialSet()),
    };
  }

  const testEnvironment = readEnvironmentModeStatus('test');
  const liveEnvironment = readEnvironmentModeStatus('live');

  return {
    success: true,
    provider: 'stripe',
    backend,
    encryptionReady: hasStripeCredentialEncryption(),
    storageError,
    modes: {
      test: {
        stored: storedModes.test,
        environment: testEnvironment,
        effective: buildEffectiveStatus(storedModes.test, testEnvironment),
      },
      live: {
        stored: storedModes.live,
        environment: liveEnvironment,
        effective: buildEffectiveStatus(storedModes.live, liveEnvironment),
      },
    },
    timestamp: new Date().toISOString(),
  };
}

export async function saveStripeCredentialsToActiveStorage(input: StripeCredentialInput) {
  const backend = resolveStripeStorageBackend();

  if (backend === 'repository') {
    const repository = await getStoreRepository();
    return repository.saveStripeCredentials(input);
  }

  return saveSupabaseStripeCredentials(input);
}

export async function getStoredStripeCredentials(mode: StripeMode) {
  const backend = resolveStripeStorageBackend();

  if (backend === 'repository') {
    const repository = await getStoreRepository();
    return repository.getStripeCredentials(mode);
  }

  return decodeStoredStripeCredentials(mode, await getSupabaseStoredStripeCredentialSet(mode));
}

export async function resolveStripeSecretKey(mode: StripeMode) {
  try {
    const storedCredentials = await getStoredStripeCredentials(mode);

    if (storedCredentials?.secretKey?.trim()) {
      return {
        secretKey: storedCredentials.secretKey.trim(),
        source: 'database' as const,
      };
    }
  } catch {
    // Fall through to environment variables.
  }

  const directModeKey = process.env[`STRIPE_${mode.toUpperCase()}_SECRET_KEY`]?.trim() || '';
  const fallbackKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
  const secretKey = directModeKey || fallbackKey;

  return {
    secretKey,
    source: secretKey ? 'environment' as const : 'missing' as const,
  };
}

export async function getStripeCandidateSecretKeys() {
  const keys = new Set<string>();

  for (const mode of ['test', 'live'] as StripeMode[]) {
    try {
      const storedCredentials = await getStoredStripeCredentials(mode);

      if (storedCredentials?.secretKey?.trim()) {
        keys.add(storedCredentials.secretKey.trim());
      }
    } catch {
      // Ignore storage read failures and continue with env fallbacks.
    }

    const directModeKey = process.env[`STRIPE_${mode.toUpperCase()}_SECRET_KEY`]?.trim() || '';

    if (directModeKey) {
      keys.add(directModeKey);
    }
  }

  const genericKey = process.env.STRIPE_SECRET_KEY?.trim() || '';

  if (genericKey) {
    keys.add(genericKey);
  }

  return [...keys];
}

export async function getStripeCandidateWebhookSecrets() {
  const secrets = new Map<string, { mode: StripeMode; secret: string; source: 'database' | 'environment' }>();

  for (const mode of ['test', 'live'] as StripeMode[]) {
    try {
      const storedCredentials = await getStoredStripeCredentials(mode);
      const storedWebhookSecret = storedCredentials?.webhookSecret?.trim() || '';

      if (storedWebhookSecret) {
        secrets.set(`database:${mode}:${storedWebhookSecret}`, {
          mode,
          secret: storedWebhookSecret,
          source: 'database',
        });
      }
    } catch {
      // Ignore storage read failures and continue with env fallbacks.
    }

    const directModeSecret = process.env[`STRIPE_${mode.toUpperCase()}_WEBHOOK_SECRET`]?.trim() || '';

    if (directModeSecret) {
      secrets.set(`environment:${mode}:${directModeSecret}`, {
        mode,
        secret: directModeSecret,
        source: 'environment',
      });
    }
  }

  const genericSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || '';

  if (genericSecret) {
    secrets.set(`environment:test:${genericSecret}`, {
      mode: 'test',
      secret: genericSecret,
      source: 'environment',
    });
    secrets.set(`environment:live:${genericSecret}`, {
      mode: 'live',
      secret: genericSecret,
      source: 'environment',
    });
  }

  return [...secrets.values()];
}

async function fetchStripeAccount(secretKey: string) {
  const response = await fetch('https://api.stripe.com/v1/account', {
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

export async function testStripeConnection(mode: StripeMode): Promise<StripeConnectionTestPayload> {
  const { secretKey, source } = await resolveStripeSecretKey(mode);

  if (!secretKey) {
    throw new Error(`Nenhuma secret key foi encontrada para o modo ${mode}.`);
  }

  const account = await fetchStripeAccount(secretKey);
  const livemode = Boolean(account?.livemode);
  const businessName =
    String(
      account?.settings?.dashboard?.display_name
      || account?.business_profile?.name
      || account?.email
      || '',
    ).trim();

  return {
    success: true,
    provider: 'stripe',
    mode,
    secretSource: source,
    accountId: String(account?.id || ''),
    businessName: businessName || 'Conta Stripe',
    country: String(account?.country || '').toUpperCase(),
    currency: String(account?.default_currency || '').toUpperCase(),
    chargesEnabled: Boolean(account?.charges_enabled),
    detailsSubmitted: Boolean(account?.details_submitted),
    livemode,
    modeMatchesSelection: mode === 'live' ? livemode : !livemode,
    timestamp: new Date().toISOString(),
  };
}
