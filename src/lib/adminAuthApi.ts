import { getAdminApiBaseUrl } from './storeBackend';

export type AdminRole = 'administrator' | 'financial' | 'support';

export type AdminPermission =
  | 'dashboard:read'
  | 'products:read'
  | 'products:write'
  | 'categories:read'
  | 'categories:write'
  | 'banners:read'
  | 'banners:write'
  | 'home:read'
  | 'home:write'
  | 'raffles:read'
  | 'raffles:write'
  | 'messages:read'
  | 'messages:write'
  | 'newsletter:read'
  | 'customers:read'
  | 'customers:write'
  | 'orders:read'
  | 'orders:write'
  | 'promotions:read'
  | 'promotions:write'
  | 'layout:read'
  | 'layout:write'
  | 'settings:read'
  | 'settings:write'
  | 'integrations:read'
  | 'integrations:write'
  | 'security:read'
  | 'security:write';

export type AdminUser = {
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  role: AdminRole;
  status: 'active' | 'inactive';
  updatedAt: string;
};

export type AdminSessionPayload = {
  authenticated: boolean;
  permissions: AdminPermission[];
  user: AdminUser | null;
};

export type AdminAuditLogRecord = {
  action: string;
  actorEmail: string;
  actorId: string;
  actorType: 'admin' | 'customer' | 'system';
  createdAt: string;
  diffJson: Record<string, unknown> | null;
  entityId: string;
  entityType: string;
  id: string;
  ipAddress: string;
  userAgent: string;
};

export type AdminMfaSetupPayload = {
  provisioningUri: string;
  secret: string;
  success: true;
};

export class AdminApiError extends Error {
  code: string;

  constructor(message: string, code = 'ADMIN_API_ERROR') {
    super(message);
    this.code = code;
  }
}

async function requestAdminApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildAdminApiUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = await response.clone().json().catch(() => null) as { code?: string; message?: string } | null;
    throw new AdminApiError(
      payload?.message || `Admin API request failed with status ${response.status}.`,
      payload?.code || 'ADMIN_API_ERROR',
    );
  }

  return response.json() as Promise<T>;
}

function buildAdminApiUrl(path: string) {
  return new URL(`${getAdminApiBaseUrl()}${path}`, window.location.origin).toString();
}

export async function getCurrentAdminSession() {
  return requestAdminApi<AdminSessionPayload>('/session');
}

export async function loginAdmin(email: string, password: string, otp?: string) {
  return requestAdminApi<AdminSessionPayload>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, otp }),
  });
}

export async function logoutAdmin() {
  return requestAdminApi<{ success: true }>('/logout', {
    method: 'POST',
  });
}

export async function requestAdminPasswordReset(email: string) {
  return requestAdminApi<{ success: true; message: string; resetToken?: string; resetUrl?: string }>('/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetAdminPassword(token: string, password: string) {
  return requestAdminApi<{ success: true }>('/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  return requestAdminApi<{ payload: AdminSessionPayload; success: true }>('/password/change', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function setupAdminMfa() {
  return requestAdminApi<AdminMfaSetupPayload>('/mfa/setup', {
    method: 'POST',
  });
}

export async function enableAdminMfa(otp: string) {
  return requestAdminApi<{ success: true; user: AdminUser }>('/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export async function disableAdminMfa(password: string, otp: string) {
  return requestAdminApi<{ success: true; user: AdminUser }>('/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, otp }),
  });
}

export async function getAdminAuditLogs(limit = 100) {
  return requestAdminApi<{ items: AdminAuditLogRecord[]; success: true }>(`/audit-logs?limit=${encodeURIComponent(String(limit))}`);
}
