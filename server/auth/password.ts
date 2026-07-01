import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { StoreApiConfig } from '../config';

const scrypt = promisify(nodeScrypt);
const PASSWORD_HASH_VERSION = 'scrypt-v1';
const PASSWORD_KEY_LENGTH = 64;

function normalizePasswordMaterial(password: string, config: StoreApiConfig) {
  return `${config.auth.passwordPepper}:${password}`;
}

export function validatePasswordStrength(password: string, config: StoreApiConfig) {
  const normalized = password.trim();

  if (normalized.length < config.auth.minPasswordLength) {
    throw new Error(`Password must contain at least ${config.auth.minPasswordLength} characters.`);
  }

  return normalized;
}

export async function hashPassword(password: string, config: StoreApiConfig) {
  const normalizedPassword = validatePasswordStrength(password, config);
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(normalizePasswordMaterial(normalizedPassword, config), salt, PASSWORD_KEY_LENGTH) as Buffer;
  return `${PASSWORD_HASH_VERSION}$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string, config: StoreApiConfig) {
  const [version, salt, expectedHash] = storedHash.split('$');

  if (version !== PASSWORD_HASH_VERSION || !salt || !expectedHash) {
    return false;
  }

  const derivedKey = await scrypt(normalizePasswordMaterial(password, config), salt, PASSWORD_KEY_LENGTH) as Buffer;
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (expectedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedKey);
}
