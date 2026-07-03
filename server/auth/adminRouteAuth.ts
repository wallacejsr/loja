import type { Request, Response, NextFunction } from 'express';
import type { StoreApiConfig } from '../config';
import type { StoreRepository } from '../store/types';
import type { AdminPermission } from './adminPermissions';
import { adminHasPermission } from './adminPermissions';
import {
  buildAdminSessionCookieHeader,
  buildExpiredAdminSessionCookieHeader,
  hashAdminSessionToken,
} from './adminSession';

function getUserAgent(request: Request) {
  const rawValue = request.headers['user-agent'];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return (value || '').slice(0, 255);
}

export async function resolveAuthenticatedAdmin(
  request: Request,
  response: Response,
  repository: StoreRepository,
  config: StoreApiConfig,
) {
  const token = request.cookies?.[config.adminSession.cookieName];

  if (!token) {
    return null;
  }

  const tokenHash = hashAdminSessionToken(token, config.adminSession);
  const session = await repository.getAdminSessionByTokenHash(tokenHash);

  if (!session) {
    response.setHeader('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
    return null;
  }

  const isExpired = new Date(session.expiresAt).getTime() <= Date.now();
  if (session.revokedAt || isExpired) {
    await repository.revokeAdminSession(session.id);
    response.setHeader('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
    return null;
  }

  const nextExpiresAt = new Date(Date.now() + config.auth.adminSessionIdleTtlSeconds * 1000);
  await repository.touchAdminSession(session.id, request.clientIp || '', getUserAgent(request), nextExpiresAt.toISOString());

  const payload = await repository.getAdminSessionPayload(session.adminUserId);
  if (!payload?.authenticated || !payload.user) {
    await repository.revokeAdminSession(session.id);
    response.setHeader('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
    return null;
  }

  request.currentAdminUserId = payload.user.id;
  request.currentAdminEmail = payload.user.email;
  request.currentAdminRole = payload.user.role;
  request.currentAdminSessionId = session.id;

  response.setHeader('Set-Cookie', buildAdminSessionCookieHeader(token, config.adminSession, nextExpiresAt));

  return {
    payload,
    session,
  };
}

export function requireAdminPermission(
  repository: StoreRepository,
  config: StoreApiConfig,
  permission: AdminPermission,
) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);

      if (!resolved?.payload.user) {
        response.status(401).json({
          code: 'ADMIN_UNAUTHORIZED',
          message: 'Administrator authentication is required.',
          success: false,
        });
        return;
      }

      if (!adminHasPermission(resolved.payload.user.role, permission)) {
        await repository.createAuditLog({
          action: `admin.permission_denied:${permission}`,
          actorEmail: resolved.payload.user.email,
          actorId: resolved.payload.user.id,
          actorType: 'admin',
          entityId: request.originalUrl,
          entityType: 'admin_api',
          ipAddress: request.clientIp || '',
          userAgent: getUserAgent(request),
        });

        response.status(403).json({
          code: 'ADMIN_FORBIDDEN',
          message: 'Your administrator account does not have permission for this action.',
          success: false,
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function auditAdminAction(
  repository: StoreRepository,
  request: Request,
  input: {
    action: string;
    diffJson?: Record<string, unknown> | null;
    entityId: string;
    entityType: string;
  },
) {
  await repository.createAuditLog({
    action: input.action,
    actorEmail: request.currentAdminEmail || '',
    actorId: request.currentAdminUserId || '',
    actorType: 'admin',
    diffJson: input.diffJson || null,
    entityId: input.entityId,
    entityType: input.entityType,
    ipAddress: request.clientIp || '',
    userAgent: getUserAgent(request),
  });
}

