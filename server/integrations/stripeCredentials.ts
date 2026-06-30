import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { StripeMode } from '../../src/types/settings';
import type {
  StoredStripeCredentialSet,
  StripeCredentialInput,
  StripeCredentialSummary,
  StripeCredentials,
} from '../store/types';

const ENCRYPTION_VERSION = 'v1';

function getConfiguredEncryptionSecret() {
  return (
    process.env.APP_SECRETS_ENCRYPTION_KEY?.trim()
    || process.env.STORE_SECRETS_ENCRYPTION_KEY?.trim()
    || ''
  );
}

function getDerivedEncryptionKey() {
  const secret = getConfiguredEncryptionSecret();

  if (!secret) {
    throw new Error(
      'Configure APP_SECRETS_ENCRYPTION_KEY para salvar credenciais privadas da Stripe no banco.',
    );
  }

  return createHash('sha256').update(secret).digest();
}

function encodeBinary(buffer: Buffer) {
  return buffer.toString('base64url');
}

function decodeBinary(value: string) {
  return Buffer.from(value, 'base64url');
}

function hasStoredValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function hasStripeCredentialEncryption() {
  return Boolean(getConfiguredEncryptionSecret());
}

export function createEmptyStoredStripeCredentialSet(): StoredStripeCredentialSet {
  return {
    publishableKeyEncrypted: '',
    secretKeyEncrypted: '',
    webhookSecretEncrypted: '',
    updatedAt: null,
  };
}

export function encryptStoredSecret(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getDerivedEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_VERSION}:${encodeBinary(iv)}:${encodeBinary(authTag)}:${encodeBinary(encrypted)}`;
}

export function decryptStoredSecret(value: string) {
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

  const [, encodedIv, encodedTag, encodedPayload] = parts;
  const decipher = createDecipheriv('aes-256-gcm', getDerivedEncryptionKey(), decodeBinary(encodedIv));
  decipher.setAuthTag(decodeBinary(encodedTag));

  const decrypted = Buffer.concat([
    decipher.update(decodeBinary(encodedPayload)),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function maskPlainSecret(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}••••`;
  }

  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

function maskStoredSecret(value: string) {
  if (!hasStoredValue(value)) {
    return '';
  }

  try {
    return maskPlainSecret(decryptStoredSecret(value));
  } catch {
    return 'Configurada';
  }
}

export function buildStripeCredentialSummary(
  mode: StripeMode,
  stored: StoredStripeCredentialSet | null | undefined,
): StripeCredentialSummary {
  const source = stored || createEmptyStoredStripeCredentialSet();
  const publishableKeyConfigured = hasStoredValue(source.publishableKeyEncrypted);
  const secretKeyConfigured = hasStoredValue(source.secretKeyEncrypted);
  const webhookSecretConfigured = hasStoredValue(source.webhookSecretEncrypted);

  return {
    mode,
    publishableKeyConfigured,
    publishableKeyMasked: maskStoredSecret(source.publishableKeyEncrypted),
    secretKeyConfigured,
    secretKeyMasked: maskStoredSecret(source.secretKeyEncrypted),
    webhookSecretConfigured,
    webhookSecretMasked: maskStoredSecret(source.webhookSecretEncrypted),
    updatedAt: source.updatedAt || null,
    ready: publishableKeyConfigured && secretKeyConfigured && webhookSecretConfigured,
  };
}

export function applyStripeCredentialInput(
  current: StoredStripeCredentialSet | null | undefined,
  input: StripeCredentialInput,
): StoredStripeCredentialSet {
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
    next.publishableKeyEncrypted = encryptStoredSecret(nextPublishableKey);
    hasChanged = true;
  }

  if (nextSecretKey) {
    next.secretKeyEncrypted = encryptStoredSecret(nextSecretKey);
    hasChanged = true;
  }

  if (nextWebhookSecret) {
    next.webhookSecretEncrypted = encryptStoredSecret(nextWebhookSecret);
    hasChanged = true;
  }

  if (hasChanged) {
    next.updatedAt = new Date().toISOString();
  }

  return next;
}

export function decodeStoredStripeCredentials(
  mode: StripeMode,
  stored: StoredStripeCredentialSet | null | undefined,
): StripeCredentials | null {
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
    publishableKey: decryptStoredSecret(source.publishableKeyEncrypted),
    secretKey: decryptStoredSecret(source.secretKeyEncrypted),
    webhookSecret: decryptStoredSecret(source.webhookSecretEncrypted),
    updatedAt: source.updatedAt || null,
  };
}
