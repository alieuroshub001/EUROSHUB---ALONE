'use client';

import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  User,
  FolderKanban,
  Kanban,
  FolderOpen,
  LucideIcon
} from 'lucide-react';

// Types for navigation items
export interface SubItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export interface NavigationItem {
  title: string;
  icon: LucideIcon;
  path: string;
  description: string;
  subItems?: SubItem[];
}

export interface FooterLink {
  title: string;
  icon: LucideIcon;
  path: string;
  description: string;
  isLogout?: boolean;
}

export interface RoleInfo {
  displayName: string;
  color: string;
  bgColor: string;
}

export type UserRole = 'superadmin' | 'admin' | 'client' | 'hr' | 'employee';

export const navigationLinks: Record<UserRole, NavigationItem[]> = {
  superadmin: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/superadmin',
      description: 'Overview and analytics'
    },
    {
      title: 'User Management',
      icon: Shield,
      path: '/superadmin/user-management',
      description: 'Manage all users and roles',
      subItems: [
        { title: 'All Users', path: '/superadmin/user-management', icon: Users },
      ]
    },
    {
      title: 'Project Management',
      icon: FolderKanban,
      path: '/superadmin/project-management',
      description: 'Manage all projects and tasks',
      subItems: [
        { title: 'Boards', path: '/superadmin/boards', icon: Kanban }
      ]
    },
    {
      title: 'Profile',
      icon: User,
      path: '/superadmin/profile',
      description: 'Manage your profile'
    }
  ],

  admin: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
      description: 'Company overview'
    },
    {
      title: 'User Management',
      icon: Users,
      path: '/admin/user-management',
      description: 'Manage company users',
      subItems: [
        { title: 'All Users', path: '/admin/user-management', icon: Users },
      ]
    },
    {
      title: 'Project Management',
      icon: FolderKanban,
      path: '/admin/project-management',
      description: 'Manage company projects and tasks',
      subItems: [
        { title: 'Boards', path: '/admin/boards', icon: Kanban }
      ]
    },
    {
      title: 'Profile',
      icon: User,
      path: '/admin/profile',
      description: 'Manage your profile'
    }
  ],

  client: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/client',
      description: 'Project overview'
    },
    {
      title: 'Project Management',
      icon: FolderKanban,
      path: '/client/project-management',
      description: 'View and track your projects',
      subItems: [
        { title: 'Boards', path: '/client/boards', icon: Kanban }
      ]
    },
    {
      title: 'Profile',
      icon: User,
      path: '/client/profile',
      description: 'Manage your profile'
    }
  ],

  hr: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/hr',
      description: 'HR overview'
    },
    {
      title: 'Employee Management',
      icon: Users,
      path: '/hr/user-management',
      description: 'Manage employees',
      subItems: [
        { title: 'All Employees', path: '/hr/user-management', icon: Users },
      ]
    },
    {
      title: 'Project Management',
      icon: FolderKanban,
      path: '/hr/project-management',
      description: 'Oversee team projects and resource allocation',
      subItems: [
        { title: 'Boards', path: '/hr/boards', icon: Kanban }
      ]
    },
    {
      title: 'Profile',
      icon: User,
      path: '/hr/profile',
      description: 'Manage your profile'
    }
  ],

  employee: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/employee',
      description: 'Personal overview'
    },
    {
      title: 'Project Management',
      icon: FolderKanban,
      path: '/employee/project-management',
      description: 'Manage assigned tasks and projects',
      subItems: [
        { title: 'Boards', path: '/employee/boards', icon: Kanban }
      ]
    },
    {
      title: 'Profile',
      icon: User,
      path: '/employee/profile',
      description: 'Manage your profile'
    }
  ]
};

// Common footer links for all roles
export const footerLinks: FooterLink[] = [
  {
    title: 'Help & Support',
    icon: HelpCircle,
    path: '/help',
    description: 'Get help and support'
  },
  {
    title: 'Settings',
    icon: Settings,
    path: '/account/settings',
    description: 'Account settings'
  },
  {
    title: 'Logout',
    icon: LogOut,
    path: '/logout',
    description: 'Sign out of your account',
    isLogout: true
  }
];

// Get navigation links by role
export const getNavigationByRole = (role: UserRole): NavigationItem[] => {
  return navigationLinks[role] || navigationLinks.employee;
};

// Get role display name and color
export const getRoleInfo = (role: UserRole): RoleInfo => {
  const roleInfo: Record<UserRole, RoleInfo> = {
    superadmin: {
      displayName: 'Super Admin',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    },
    admin: {
      displayName: 'Administrator',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    client: {
      displayName: 'Client',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    hr: {
      displayName: 'HR Manager',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    employee: {
      displayName: 'Employee',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10'
    }
  };
  
  return roleInfo[role] || roleInfo.employee;
};