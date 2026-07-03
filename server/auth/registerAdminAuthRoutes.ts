import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type { StoreApiConfig } from '../config';
import type { StoreRepository } from '../store/types';
import { decryptStoredSecret, encryptStoredSecret } from '../integrations/stripeCredentials';
import { adminHasPermission } from './adminPermissions';
import { hashPassword, verifyPassword } from './password';
import { resolveAuthenticatedAdmin } from './adminRouteAuth';
import {
  buildAdminSessionCookieHeader,
  buildExpiredAdminSessionCookieHeader,
  generateAdminSessionToken,
  hashAdminSessionToken,
} from './adminSession';
import { buildTotpProvisioningUri, generateTotpSecret, verifyTotpCode } from './adminTotp';

const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const passwordResetRequestThrottle = new Map<string, number>();

function handleAdminError(response: Response, error: unknown, statusCode = 400, code = 'ADMIN_API_ERROR') {
  const message = error instanceof Error ? error.message : 'Administrator request failed.';
  response.status(statusCode).json({
    code,
    message,
    success: false,
  });
}

function getUserAgent(request: Request) {
  const rawValue = request.headers['user-agent'];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  return (value || '').slice(0, 255);
}

function createResetToken() {
  return randomBytes(32).toString('base64url');
}

function hashResetToken(token: string, config: StoreApiConfig) {
  return createHash('sha256')
    .update(`${config.adminSession.pepper}:${token}`)
    .digest('hex');
}

export function registerAdminAuthRoutes(repository: StoreRepository, config: StoreApiConfig) {
  const router = Router();

  router.get('/session', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);

      if (!resolved) {
        response.json({
          authenticated: false,
          permissions: [],
          user: null,
        });
        return;
      }

      response.json(resolved.payload);
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/login', async (request, response) => {
    try {
      const email = String(request.body?.email || '').trim().toLowerCase();
      const password = String(request.body?.password || '');
      const otp = String(request.body?.otp || '').trim();

      if (!email || !password) {
        handleAdminError(response, new Error('Email and password are required.'), 400, 'INVALID_CREDENTIALS');
        return;
      }

      const adminUser = await repository.findAdminAuthByEmail(email);
      if (!adminUser) {
        await repository.createAuditLog({
          action: 'admin.login_failed',
          actorEmail: email,
          actorType: 'system',
          entityId: email,
          entityType: 'admin_user',
          ipAddress: request.clientIp || '',
          userAgent: getUserAgent(request),
        });
        handleAdminError(response, new Error('Invalid administrator credentials.'), 401, 'INVALID_CREDENTIALS');
        return;
      }

      if (adminUser.status !== 'active') {
        handleAdminError(response, new Error('This administrator account is inactive.'), 403, 'ACCOUNT_DISABLED');
        return;
      }

      if (adminUser.lockedUntil && new Date(adminUser.lockedUntil).getTime() > Date.now()) {
        handleAdminError(response, new Error('Too many failed attempts. Try again later.'), 429, 'ACCOUNT_LOCKED');
        return;
      }

      const passwordMatches = await verifyPassword(password, adminUser.passwordHash, config);
      if (!passwordMatches) {
        const nextAttempts = adminUser.failedLoginAttempts + 1;
        const lockedUntil = nextAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOGIN_LOCK_WINDOW_MS).toISOString()
          : null;

        await repository.recordAdminLoginFailure(adminUser.id, nextAttempts, lockedUntil);
        await repository.createAuditLog({
          action: 'admin.login_failed',
          actorEmail: adminUser.email,
          actorId: adminUser.id,
          actorType: 'admin',
          diffJson: { failedAttempts: nextAttempts, lockedUntil },
          entityId: adminUser.id,
          entityType: 'admin_user',
          ipAddress: request.clientIp || '',
          userAgent: getUserAgent(request),
        });

        handleAdminError(response, new Error('Invalid administrator credentials.'), 401, 'INVALID_CREDENTIALS');
        return;
      }

      if (adminUser.mfaEnabled) {
        const decryptedSecret = decryptStoredSecret(adminUser.mfaSecretEncrypted);
        if (!otp || !verifyTotpCode(decryptedSecret, otp)) {
          await repository.createAuditLog({
            action: 'admin.mfa_failed',
            actorEmail: adminUser.email,
            actorId: adminUser.id,
            actorType: 'admin',
            entityId: adminUser.id,
            entityType: 'admin_user',
            ipAddress: request.clientIp || '',
            userAgent: getUserAgent(request),
          });

          handleAdminError(response, new Error('Two-factor authentication code required.'), 401, 'MFA_REQUIRED');
          return;
        }
      }

      const payload = await repository.getAdminSessionPayload(adminUser.id);
      if (!payload?.user) {
        handleAdminError(response, new Error('Unable to load the administrator account.'), 500, 'ADMIN_LOAD_FAILED');
        return;
      }

      const sessionToken = generateAdminSessionToken();
      const expiresAt = new Date(Date.now() + config.auth.adminSessionIdleTtlSeconds * 1000);

      await repository.createAdminSession({
        adminUserId: adminUser.id,
        expiresAt: expiresAt.toISOString(),
        ipAddress: request.clientIp || '',
        sessionTokenHash: hashAdminSessionToken(sessionToken, config.adminSession),
        userAgent: getUserAgent(request),
      });

      await repository.createAuditLog({
        action: 'admin.login_success',
        actorEmail: adminUser.email,
        actorId: adminUser.id,
        actorType: 'admin',
        entityId: adminUser.id,
        entityType: 'admin_user',
        ipAddress: request.clientIp || '',
        userAgent: getUserAgent(request),
      });

      response.setHeader('Set-Cookie', buildAdminSessionCookieHeader(sessionToken, config.adminSession, expiresAt));
      response.json(payload);
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/logout', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);

      if (resolved?.session.id) {
        await repository.revokeAdminSession(resolved.session.id);
        await repository.createAuditLog({
          action: 'admin.logout',
          actorEmail: resolved.payload.user?.email || '',
          actorId: resolved.payload.user?.id || '',
          actorType: 'admin',
          entityId: resolved.payload.user?.id || 'unknown',
          entityType: 'admin_user',
          ipAddress: request.clientIp || '',
          userAgent: getUserAgent(request),
        });
      }

      response.setHeader('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
      response.json({ success: true });
    } catch (error) {
      response.setHeader('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
      handleAdminError(response, error, 500);
    }
  });

  router.post('/password/forgot', async (request, response) => {
    try {
      const email = String(request.body?.email || '').trim().toLowerCase();
      const throttleKey = `${request.clientIp || 'unknown'}:${email}`;
      const lastRequestAt = passwordResetRequestThrottle.get(throttleKey) || 0;

      if (Date.now() - lastRequestAt < 30_000) {
        response.json({
          success: true,
          message: 'If the administrator account exists, a reset flow has been created.',
        });
        return;
      }

      passwordResetRequestThrottle.set(throttleKey, Date.now());

      if (email) {
        const adminUser = await repository.findAdminAuthByEmail(email);
        if (adminUser) {
          const rawToken = createResetToken();
          const expiresAt = new Date(Date.now() + config.auth.adminPasswordResetTtlSeconds * 1000);
          await repository.createAdminPasswordResetToken({
            adminUserId: adminUser.id,
            expiresAt: expiresAt.toISOString(),
            ipAddress: request.clientIp || '',
            tokenHash: hashResetToken(rawToken, config),
            userAgent: getUserAgent(request),
          });

          await repository.createAuditLog({
            action: 'admin.password_reset_requested',
            actorEmail: adminUser.email,
            actorId: adminUser.id,
            actorType: 'admin',
            entityId: adminUser.id,
            entityType: 'admin_user',
            ipAddress: request.clientIp || '',
            userAgent: getUserAgent(request),
          });

          response.json({
            success: true,
            message: 'If the administrator account exists, a reset flow has been created.',
            ...(config.env !== 'production'
              ? { resetToken: rawToken, resetUrl: `${config.appBaseUrl.replace(/\/$/, '')}/login/reset?token=${encodeURIComponent(rawToken)}` }
              : {}),
          });
          return;
        }
      }

      response.json({
        success: true,
        message: 'If the administrator account exists, a reset flow has been created.',
      });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/password/reset', async (request, response) => {
    try {
      const token = String(request.body?.token || '').trim();
      const password = String(request.body?.password || '');

      if (!token || !password) {
        handleAdminError(response, new Error('Token and new password are required.'), 400, 'RESET_INVALID');
        return;
      }

      const resetRecord = await repository.getAdminPasswordResetByTokenHash(hashResetToken(token, config));
      if (!resetRecord) {
        handleAdminError(response, new Error('Invalid or expired reset token.'), 400, 'RESET_INVALID');
        return;
      }

      if (resetRecord.usedAt || new Date(resetRecord.expiresAt).getTime() <= Date.now()) {
        handleAdminError(response, new Error('Invalid or expired reset token.'), 400, 'RESET_INVALID');
        return;
      }

      const passwordHash = await hashPassword(password, config);
      await repository.updateAdminPassword(resetRecord.adminUserId, passwordHash);
      await repository.markAdminPasswordResetTokenUsed(resetRecord.id);
      await repository.revokeAdminSessionsByUserId(resetRecord.adminUserId);
      await repository.createAuditLog({
        action: 'admin.password_reset_completed',
        actorEmail: resetRecord.email,
        actorId: resetRecord.adminUserId,
        actorType: 'admin',
        entityId: resetRecord.adminUserId,
        entityType: 'admin_user',
        ipAddress: request.clientIp || '',
        userAgent: getUserAgent(request),
      });

      response.setHeader('Set-Cookie', buildExpiredAdminSessionCookieHeader(config.adminSession));
      response.json({ success: true });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/mfa/setup', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);
      if (!resolved?.payload.user) {
        handleAdminError(response, new Error('Administrator authentication is required.'), 401, 'ADMIN_UNAUTHORIZED');
        return;
      }

      const secret = generateTotpSecret();
      await repository.saveAdminMfaSecret(resolved.payload.user.id, encryptStoredSecret(secret), false);
      await repository.createAuditLog({
        action: 'admin.mfa_setup_started',
        actorEmail: resolved.payload.user.email,
        actorId: resolved.payload.user.id,
        actorType: 'admin',
        entityId: resolved.payload.user.id,
        entityType: 'admin_user',
        ipAddress: request.clientIp || '',
        userAgent: getUserAgent(request),
      });

      response.json({
        success: true,
        secret,
        provisioningUri: buildTotpProvisioningUri(secret, resolved.payload.user.email, 'ZENV Admin'),
      });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/mfa/enable', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);
      if (!resolved?.payload.user) {
        handleAdminError(response, new Error('Administrator authentication is required.'), 401, 'ADMIN_UNAUTHORIZED');
        return;
      }

      const otp = String(request.body?.otp || '').trim();
      const adminUser = await repository.findAdminAuthByEmail(resolved.payload.user.email);
      if (!adminUser?.mfaSecretEncrypted) {
        handleAdminError(response, new Error('MFA setup was not initialized.'), 400, 'MFA_NOT_INITIALIZED');
        return;
      }

      const secret = decryptStoredSecret(adminUser.mfaSecretEncrypted);
      if (!verifyTotpCode(secret, otp)) {
        handleAdminError(response, new Error('Invalid MFA code.'), 400, 'MFA_INVALID_CODE');
        return;
      }

      const user = await repository.saveAdminMfaSecret(resolved.payload.user.id, adminUser.mfaSecretEncrypted, true);
      await repository.createAuditLog({
        action: 'admin.mfa_enabled',
        actorEmail: user.email,
        actorId: user.id,
        actorType: 'admin',
        entityId: user.id,
        entityType: 'admin_user',
        ipAddress: request.clientIp || '',
        userAgent: getUserAgent(request),
      });

      response.json({
        success: true,
        user,
      });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/mfa/disable', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);
      if (!resolved?.payload.user) {
        handleAdminError(response, new Error('Administrator authentication is required.'), 401, 'ADMIN_UNAUTHORIZED');
        return;
      }

      const password = String(request.body?.password || '');
      const otp = String(request.body?.otp || '').trim();
      const adminUser = await repository.findAdminAuthByEmail(resolved.payload.user.email);

      if (!adminUser) {
        handleAdminError(response, new Error('Administrator account not found.'), 404, 'ADMIN_NOT_FOUND');
        return;
      }

      const passwordMatches = await verifyPassword(password, adminUser.passwordHash, config);
      const secret = decryptStoredSecret(adminUser.mfaSecretEncrypted);

      if (!passwordMatches || !verifyTotpCode(secret, otp)) {
        handleAdminError(response, new Error('Current password or MFA code is invalid.'), 400, 'MFA_DISABLE_INVALID');
        return;
      }

      const user = await repository.saveAdminMfaSecret(resolved.payload.user.id, '', false);
      await repository.createAuditLog({
        action: 'admin.mfa_disabled',
        actorEmail: user.email,
        actorId: user.id,
        actorType: 'admin',
        entityId: user.id,
        entityType: 'admin_user',
        ipAddress: request.clientIp || '',
        userAgent: getUserAgent(request),
      });

      response.json({
        success: true,
        user,
      });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.post('/password/change', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);
      if (!resolved?.payload.user || !resolved.session.id) {
        handleAdminError(response, new Error('Administrator authentication is required.'), 401, 'ADMIN_UNAUTHORIZED');
        return;
      }

      const currentPassword = String(request.body?.currentPassword || '');
      const nextPassword = String(request.body?.newPassword || '');

      if (!currentPassword || !nextPassword) {
        handleAdminError(response, new Error('Current password and new password are required.'), 400, 'PASSWORD_CHANGE_INVALID');
        return;
      }

      const adminUser = await repository.findAdminAuthByEmail(resolved.payload.user.email);
      if (!adminUser) {
        handleAdminError(response, new Error('Administrator account not found.'), 404, 'ADMIN_NOT_FOUND');
        return;
      }

      const passwordMatches = await verifyPassword(currentPassword, adminUser.passwordHash, config);
      if (!passwordMatches) {
        await repository.createAuditLog({
          action: 'admin.password_change_failed',
          actorEmail: adminUser.email,
          actorId: adminUser.id,
          actorType: 'admin',
          entityId: adminUser.id,
          entityType: 'admin_user',
          ipAddress: request.clientIp || '',
          userAgent: getUserAgent(request),
        });
        handleAdminError(response, new Error('Current password is invalid.'), 400, 'PASSWORD_CHANGE_INVALID');
        return;
      }

      const nextPasswordHash = await hashPassword(nextPassword, config);
      await repository.updateAdminPassword(adminUser.id, nextPasswordHash);
      await repository.revokeAdminSessionsByUserId(adminUser.id);

      const sessionToken = generateAdminSessionToken();
      const expiresAt = new Date(Date.now() + config.auth.adminSessionIdleTtlSeconds * 1000);

      await repository.createAdminSession({
        adminUserId: adminUser.id,
        expiresAt: expiresAt.toISOString(),
        ipAddress: request.clientIp || '',
        sessionTokenHash: hashAdminSessionToken(sessionToken, config.adminSession),
        userAgent: getUserAgent(request),
      });

      const payload = await repository.getAdminSessionPayload(adminUser.id);
      if (!payload) {
        handleAdminError(response, new Error('Unable to refresh administrator session.'), 500, 'ADMIN_LOAD_FAILED');
        return;
      }

      await repository.createAuditLog({
        action: 'admin.password_changed',
        actorEmail: adminUser.email,
        actorId: adminUser.id,
        actorType: 'admin',
        entityId: adminUser.id,
        entityType: 'admin_user',
        ipAddress: request.clientIp || '',
        userAgent: getUserAgent(request),
      });

      response.setHeader('Set-Cookie', buildAdminSessionCookieHeader(sessionToken, config.adminSession, expiresAt));
      response.json({
        success: true,
        payload,
      });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  router.get('/audit-logs', async (request, response) => {
    try {
      const resolved = await resolveAuthenticatedAdmin(request, response, repository, config);
      if (!resolved?.payload.user) {
        handleAdminError(response, new Error('Administrator authentication is required.'), 401, 'ADMIN_UNAUTHORIZED');
        return;
      }

      if (!adminHasPermission(resolved.payload.user.role, 'security:read')) {
        handleAdminError(response, new Error('Permission denied.'), 403, 'ADMIN_FORBIDDEN');
        return;
      }

      const limit = Number(request.query.limit || 100);
      const logs = await repository.getAdminAuditLogs(limit);

      response.json({
        items: logs,
        success: true,
      });
    } catch (error) {
      handleAdminError(response, error, 500);
    }
  });

  return router;
}
