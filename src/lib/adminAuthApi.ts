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

export class AdminApiError extends Error {
  code: string;

  constructor(message: string, code = 'ADMIN_API_ERROR') {
    super(message);
    this.code = code;
  }
}

async function requestAdminApi<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
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

export async function getCurrentAdminSession() {
  return requestAdminApi<AdminSessionPayload>('/api/admin/session');
}

export async function loginAdmin(email: string, password: string, otp?: string) {
  return requestAdminApi<AdminSessionPayload>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, otp }),
  });
}

export async function logoutAdmin() {
  return requestAdminApi<{ success: true }>('/api/admin/logout', {
    method: 'POST',
  });
}

export async function requestAdminPasswordReset(email: string) {
  return requestAdminApi<{ success: true; message: string; resetToken?: string; resetUrl?: string }>('/api/admin/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetAdminPassword(token: string, password: string) {
  return requestAdminApi<{ success: true }>('/api/admin/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

