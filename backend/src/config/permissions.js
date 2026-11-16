// Mapa papel -> permissões. Toda checagem ocorre no backend (middleware requirePermission).
export const ROLES = ['SUPERADMIN', 'ADMIN', 'MODERADOR', 'PROFISSIONAL', 'EMPRESA', 'CLIENTE'];

const ADMIN_BASE = [
  'admin:dashboard',
  'users:read',
  'users:update',
  'categories:manage',
  'audit:read',
  'professionals:moderate',
  'professionals:manage',
  'datarequests:manage',
  'opportunities:moderate',
  'companies:manage',
];

export const PERMISSIONS = {
  SUPERADMIN: ['*'],
  ADMIN: [...ADMIN_BASE],
  MODERADOR: ['admin:dashboard', 'users:read', 'professionals:moderate', 'opportunities:moderate'],
  PROFISSIONAL: ['profile:own'],
  EMPRESA: ['company:own'],
  CLIENTE: ['profile:own'],
};

export const PUBLIC_REGISTRATION_ROLES = ['PROFISSIONAL', 'EMPRESA', 'CLIENTE'];

export function can(role, permission) {
  const list = PERMISSIONS[role] ?? [];
  return list.includes('*') || list.includes(permission);
}
