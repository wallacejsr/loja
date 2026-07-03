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

const ALL_PERMISSIONS: AdminPermission[] = [
  'dashboard:read',
  'products:read',
  'products:write',
  'categories:read',
  'categories:write',
  'banners:read',
  'banners:write',
  'home:read',
  'home:write',
  'raffles:read',
  'raffles:write',
  'messages:read',
  'messages:write',
  'newsletter:read',
  'customers:read',
  'customers:write',
  'orders:read',
  'orders:write',
  'promotions:read',
  'promotions:write',
  'layout:read',
  'layout:write',
  'settings:read',
  'settings:write',
  'integrations:read',
  'integrations:write',
  'security:read',
  'security:write',
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  administrator: ALL_PERMISSIONS,
  financial: [
    'dashboard:read',
    'orders:read',
    'orders:write',
    'customers:read',
    'messages:read',
    'newsletter:read',
    'promotions:read',
    'promotions:write',
    'integrations:read',
    'integrations:write',
    'settings:read',
    'security:read',
  ],
  support: [
    'dashboard:read',
    'orders:read',
    'customers:read',
    'customers:write',
    'messages:read',
    'messages:write',
    'newsletter:read',
    'products:read',
    'categories:read',
    'banners:read',
    'home:read',
    'raffles:read',
    'promotions:read',
    'settings:read',
    'integrations:read',
    'security:read',
  ],
};

export function getAdminRolePermissions(role: string): AdminPermission[] {
  const normalizedRole = role.trim().toLowerCase() as AdminRole;
  return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.support;
}

export function adminHasPermission(role: string, permission: AdminPermission) {
  return getAdminRolePermissions(role).includes(permission);
}

