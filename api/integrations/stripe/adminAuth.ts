import { getStoreApiConfig } from '../../../server/config.js';
import { getAdminRolePermissions, type AdminPermission } from '../../../server/auth/adminPermissions.js';
import {
  buildExpiredAdminSessionCookieHeader,
  hashAdminSessionToken,
} from '../../../server/auth/adminSession.js';
import { createStoreRepository } from '../../../server/store/repository.js';

type VercelRequestLike = {
  [key: string]: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
};

type ResolvedAdminAuth = {
  email: string;
  id: string;
  permissions: AdminPermission[];
  role: string;
};

let cachedRepositoryPromise: ReturnType<typeof createStoreRepository> | null = null;

function getRepository() {
  if (!cachedRepositoryPromise) {
    cachedRepositoryPromise = createStoreRepository();
  }

  return cachedRepositoryPromise;
}

function getHeaderValue(headers: VercelRequestLike['headers'], key: string) {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function parseCookies(cookieHeader: string) {
  return cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, chunk) => {
      const separatorIndex = chunk.indexOf('=');
      if (separatorIndex <= 0) {
        return accumulator;
      }

      const key = chunk.slice(0, separatorIndex).trim();
      const value = chunk.slice(separatorIndex + 1).trim();

      if (key) {
        accumulator[key] = decodeURIComponent(value);
      }

      return accumulator;
    }, {});
}

function resolveClientIp(request: VercelRequestLike) {
  const forwardedFor = getHeaderValue(request.headers, 'x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || '';
  }

  return '';
}

export async function requireStripeAdminPermission(
  request: VercelRequestLike,
  response: VercelResponseLike,
  permission: AdminPermission,
) {
  const config = getStoreApiConfig();
  const cookieHeader = getHeaderValue(request.headers, 'cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies[config.adminSession.cookieName];

  if (!token) {
    response.status(401).json({
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Administrator authentication is required.',
      success: false,
    });
    return null;
  }

  const repository = await getRepository();
  const sessionHash = hashAdminSessionToken(token, config.adminSession);
  const session = await repository.getAdminSessionByTokenHash(sessionHash);

  if (!session) {
    response.setHeader?.('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
    response.status(401).json({
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Administrator authentication is required.',
      success: false,
    });
    return null;
  }

  const isExpired = new Date(session.expiresAt).getTime() <= Date.now();
  if (session.revokedAt || isExpired) {
    await repository.revokeAdminSession(session.id);
    response.setHeader?.('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
    response.status(401).json({
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Administrator session has expired.',
      success: false,
    });
    return null;
  }

  const payload = await repository.getAdminSessionPayload(session.adminUserId);
  if (!payload?.authenticated || !payload.user) {
    await repository.revokeAdminSession(session.id);
    response.setHeader?.('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
    response.status(401).json({
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Administrator authentication is required.',
      success: false,
    });
    return null;
  }

  const permissions = getAdminRolePermissions(payload.user.role);
  if (!permissions.includes(permission)) {
    await repository.createAuditLog({
      action: 'admin.permission_denied',
      actorEmail: payload.user.email,
      actorId: payload.user.id,
      actorType: 'admin',
      diffJson: { permission },
      entityId: permission,
      entityType: 'admin_permission',
      ipAddress: resolveClientIp(request),
      userAgent: getHeaderValue(request.headers, 'user-agent').slice(0, 255),
    });

    response.status(403).json({
      code: 'ADMIN_FORBIDDEN',
      message: 'Permission denied.',
      success: false,
    });
    return null;
  }

  return {
    email: payload.user.email,
    id: payload.user.id,
    permissions,
    role: payload.user.role,
  } satisfies ResolvedAdminAuth;
}
