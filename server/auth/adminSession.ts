import { createHash, randomBytes } from 'node:crypto';
import type { CookieSameSitePolicy } from '../config';

type AdminSessionCookieConfig = {
  cookieDomain: string;
  cookieName: string;
  pepper: string;
  sameSite: CookieSameSitePolicy;
  secure: boolean;
};

function buildCookieParts(
  name: string,
  value: string,
  config: AdminSessionCookieConfig,
  expiresAt: Date,
) {
  const sameSiteValue = config.sameSite === 'none'
    ? 'None'
    : config.sameSite === 'strict'
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

  if (config.secure) {
    parts.push('Secure');
  }

  if (config.cookieDomain) {
    parts.push(`Domain=${config.cookieDomain}`);
  }

  return parts;
}

export function generateAdminSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashAdminSessionToken(token: string, config: AdminSessionCookieConfig) {
  return createHash('sha256')
    .update(`${config.pepper}:${token}`)
    .digest('hex');
}

export function buildAdminSessionCookieHeader(
  token: string,
  config: AdminSessionCookieConfig,
  expiresAt: Date,
) {
  return buildCookieParts(config.cookieName, token, config, expiresAt).join('; ');
}

export function buildExpiredAdminSessionCookieHeader(config: AdminSessionCookieConfig) {
  return buildCookieParts(config.cookieName, '', config, new Date(0)).join('; ');
}

