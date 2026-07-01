import { createHash, randomBytes } from 'node:crypto';
import type { StoreApiConfig } from '../config';

function buildCookieParts(
  name: string,
  value: string,
  config: StoreApiConfig,
  expiresAt: Date,
) {
  const sameSiteValue = config.session.sameSite === 'none'
    ? 'None'
    : config.session.sameSite === 'strict'
      ? 'Strict'
      : 'Lax';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSiteValue}`,
    `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (config.session.secure) {
    parts.push('Secure');
  }

  if (config.session.cookieDomain) {
    parts.push(`Domain=${config.session.cookieDomain}`);
  }

  return parts;
}

export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string, config: StoreApiConfig) {
  return createHash('sha256')
    .update(`${config.session.pepper}:${token}`)
    .digest('hex');
}

export function buildSessionCookieHeader(token: string, config: StoreApiConfig, expiresAt: Date) {
  return buildCookieParts(config.session.cookieName, token, config, expiresAt).join('; ');
}

export function buildExpiredSessionCookieHeader(config: StoreApiConfig) {
  return buildCookieParts(config.session.cookieName, '', config, new Date(0)).join('; ');
}
