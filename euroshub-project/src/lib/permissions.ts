export type UserRole = 'superadmin' | 'admin' | 'hr' | 'employee' | 'client';

export interface Permission {
  canCreateUsers: boolean;
  canCreateSuperadmin: boolean;
  canCreateAdmin: boolean;
  canCreateHR: boolean;
  canCreateEmployee: boolean;
  canCreateClient: boolean;
  canViewUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageRoles: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  superadmin: {
    canCreateUsers: true,
    canCreateSuperadmin: true,
    canCreateAdmin: true,
    canCreateHR: true,
    canCreateEmployee: true,
    canCreateClient: true,
    canViewUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canManageRoles: true,
  },
  admin: {
    canCreateUsers: true,
    canCreateSuperadmin: false,
    canCreateAdmin: false,
    canCreateHR: true,
    canCreateEmployee: true,
    canCreateClient: true,
    canViewUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canManageRoles: false,
  },
  hr: {
    canCreateUsers: true,
    canCreateSuperadmin: false,
    canCreateAdmin: false,
    canCreateHR: false,
    canCreateEmployee: true,
    canCreateClient: false,
    canViewUsers: true,
    canEditUsers: true,
    canDeleteUsers: false,
    canManageRoles: false,
  },
  employee: {
    canCreateUsers: false,
    canCreateSuperadmin: false,
    canCreateAdmin: false,
    canCreateHR: false,
    canCreateEmployee: false,
    canCreateClient: false,
    canViewUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
  },
  client: {
    canCreateUsers: false,
    canCreateSuperadmin: false,
    canCreateAdmin: false,
    canCreateHR: false,
    canCreateEmployee: false,
    canCreateClient: false,
    canViewUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
  },
};

export const getPermissions = (role: UserRole): Permission => {
  return ROLE_PERMISSIONS[role];
};

export const canCreateRole = (userRole: UserRole, targetRole: UserRole): boolean => {
  const permissions = getPermissions(userRole);

  switch (targetRole) {
    case 'superadmin':
      return permissions.canCreateSuperadmin;
    case 'admin':
      return permissions.canCreateAdmin;
    case 'hr':
      return permissions.canCreateHR;
    case 'employee':
      return permissions.canCreateEmployee;
    case 'client':
      return permissions.canCreateClient;
    default:
      return false;
  }
};

export const getAvailableRoles = (userRole: UserRole): UserRole[] => {
  const roles: UserRole[] = [];

  if (canCreateRole(userRole, 'superadmin')) roles.push('superadmin');
  if (canCreateRole(userRole, 'admin')) roles.push('admin');
  if (canCreateRole(userRole, 'hr')) roles.push('hr');
  if (canCreateRole(userRole, 'employee')) roles.push('employee');
  if (canCreateRole(userRole, 'client')) roles.push('client');

  return roles;
};

export const hasUserManagementAccess = (role: UserRole): boolean => {
  const permissions = getPermissions(role);
  return permissions.canCreateUsers || permissions.canViewUsers;
};