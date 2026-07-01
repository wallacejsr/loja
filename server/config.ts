import path from 'node:path';

export type RuntimeEnvironment = 'development' | 'production' | 'test';
export type CookieSameSitePolicy = 'lax' | 'strict' | 'none';

export type StoreApiConfig = {
  auth: {
    minPasswordLength: number;
    passwordPepper: string;
  };
  appBaseUrl: string;
  bodyLimit: string;
  corsOrigins: string[];
  env: RuntimeEnvironment;
  host: string;
  port: number;
  rateLimit: {
    maxRequests: number;
    skipPaths: string[];
    windowMs: number;
  };
  session: {
    cookieDomain: string;
    cookieName: string;
    pepper: string;
    sameSite: CookieSameSitePolicy;
    secure: boolean;
    ttlSeconds: number;
  };
  trustProxy: boolean;
  uploadsRoot: string;
};

let cachedConfig: StoreApiConfig | null = null;

function readEnv(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function readNumberEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBooleanEnv(name: string, fallback: boolean) {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function readListEnv(name: string, fallback: string[]) {
  const rawValue = process.env[name];
  if (!rawValue?.trim()) return fallback;

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function readSameSiteEnv(name: string, fallback: CookieSameSitePolicy): CookieSameSitePolicy {
  const rawValue = readEnv(name, fallback).toLowerCase();

  if (rawValue === 'strict' || rawValue === 'none' || rawValue === 'lax') {
    return rawValue;
  }

  return fallback;
}

function readRuntimeEnvironment(): RuntimeEnvironment {
  const rawValue = readEnv('NODE_ENV', 'development').toLowerCase();
  return rawValue === 'production' || rawValue === 'test' ? rawValue : 'development';
}

export function getStoreApiConfig(): StoreApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = readRuntimeEnvironment();
  const secureByDefault = env === 'production';

  cachedConfig = {
    auth: {
      minPasswordLength: readNumberEnv('AUTH_MIN_PASSWORD_LENGTH', 8),
      passwordPepper: readEnv('AUTH_PASSWORD_PEPPER', readEnv('SESSION_TOKEN_PEPPER', '')),
    },
    env,
    host: readEnv('STORE_API_HOST', '0.0.0.0'),
    port: readNumberEnv('STORE_API_PORT', 4000),
    trustProxy: readBooleanEnv('STORE_API_TRUST_PROXY', env === 'production'),
    appBaseUrl: readEnv('APP_BASE_URL', env === 'production' ? 'https://example.com' : 'http://127.0.0.1:4000'),
    bodyLimit: readEnv('STORE_API_BODY_LIMIT', '5mb'),
    corsOrigins: readListEnv('STORE_API_CORS_ORIGIN', ['http://127.0.0.1:3000', 'http://localhost:3000']),
    uploadsRoot: path.resolve(process.cwd(), readEnv('STORE_UPLOADS_ROOT', path.join('storage', 'uploads'))),
    rateLimit: {
      windowMs: readNumberEnv('STORE_API_RATE_LIMIT_WINDOW_MS', 60_000),
      maxRequests: readNumberEnv('STORE_API_RATE_LIMIT_MAX_REQUESTS', 120),
      skipPaths: readListEnv('STORE_API_RATE_LIMIT_SKIP_PATHS', ['/api/health', '/api/store/health']),
    },
    session: {
      cookieName: readEnv('SESSION_COOKIE_NAME', 'loja_session'),
      cookieDomain: readEnv('SESSION_COOKIE_DOMAIN', ''),
      ttlSeconds: readNumberEnv('SESSION_TTL_SECONDS', 60 * 60 * 24 * 30),
      sameSite: readSameSiteEnv('SESSION_COOKIE_SAMESITE', 'lax'),
      secure: readBooleanEnv('SESSION_COOKIE_SECURE', secureByDefault),
      pepper: readEnv('SESSION_TOKEN_PEPPER', ''),
    },
  };

  return cachedConfig;
}
