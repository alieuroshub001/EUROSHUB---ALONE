'use client';

import { 
  LayoutDashboard, 
  Users, 
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  User,
  Trello,
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

// Navigation links for each user role
export const navigationLinks: Record<UserRole, NavigationItem[]> = {
  superadmin: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/superadmin',
      description: 'Overview and analytics'
    },
    {
      title: 'Project Management',
      icon: Trello,
      path: '/superadmin/projects',
      description: 'Kanban boards and task management'
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
      title: 'Profile',
      icon: User,
      path: '/superadmin/profile',
      description: 'Manage your profile'
    }
    // Commented out until backend integration is complete
    // {
    //   title: 'Organizations',
    //   icon: Building2,
    //   path: '/organizations',
    //   description: 'Manage client organizations',
    //   subItems: [
    //     { title: 'All Organizations', path: '/organizations/all', icon: Building2 },
    //     { title: 'Add Organization', path: '/organizations/add', icon: Building2 }
    //   ]
    // },
    // {
    //   title: 'System Analytics',
    //   icon: BarChart3,
    //   path: '/analytics',
    //   description: 'System-wide reports and metrics'
    // },
    // {
    //   title: 'System Settings',
    //   icon: Settings,
    //   path: '/settings',
    //   description: 'Global system configuration'
    // }
  ],

  admin: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin',
      description: 'Company overview'
    },
    {
      title: 'Project Management',
      icon: Trello,
      path: '/admin/projects',
      description: 'Kanban boards and task management'
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
      title: 'Profile',
      icon: User,
      path: '/admin/profile',
      description: 'Manage your profile'
    }
    // Commented out until backend integration is complete
    // {
    //   title: 'Departments',
    //   icon: Building2,
    //   path: '/departments',
    //   description: 'Manage departments and teams'
    // },
    // {
    //   title: 'Attendance & Leave',
    //   icon: Calendar,
    //   path: '/attendance',
    //   description: 'Track attendance and leave requests',
    //   subItems: [
    //     { title: 'Attendance Overview', path: '/attendance/overview', icon: Clock },
    //     { title: 'Leave Requests', path: '/attendance/leave', icon: Calendar },
    //     { title: 'Time Tracking', path: '/attendance/time', icon: Clock }
    //   ]
    // },
    // {
    //   title: 'Payroll',
    //   icon: DollarSign,
    //   path: '/payroll',
    //   description: 'Manage payroll and compensation'
    // },
    // {
    //   title: 'Reports',
    //   icon: BarChart3,
    //   path: '/reports',
    //   description: 'Company reports and analytics'
    // },
    // {
    //   title: 'Settings',
    //   icon: Settings,
    //   path: '/settings',
    //   description: 'Company settings'
    // }
  ],

  client: [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/client',
      description: 'Project overview'
    },
    {
      title: 'Profile',
      icon: User,
      path: '/client/profile',
      description: 'Manage your profile'
    }
    // Commented out until backend integration is complete
    // {
    //   title: 'Projects',
    //   icon: FolderOpen,
    //   path: '/projects',
    //   description: 'View and manage projects',
    //   subItems: [
    //     { title: 'Active Projects', path: '/projects/active', icon: FolderOpen },
    //     { title: 'Completed Projects', path: '/projects/completed', icon: FileText },
    //     { title: 'Project Reports', path: '/projects/reports', icon: BarChart3 }
    //   ]
    // },
    // {
    //   title: 'Team',
    //   icon: Users,
    //   path: '/team',
    //   description: 'View assigned team members'
    // },
    // {
    //   title: 'Communications',
    //   icon: MessageSquare,
    //   path: '/communications',
    //   description: 'Messages and updates'
    // },
    // {
    //   title: 'Reports',
    //   icon: FileText,
    //   path: '/reports',
    //   description: 'Project reports and progress'
    // },
    // {
    //   title: 'Billing',
    //   icon: DollarSign,
    //   path: '/billing',
    //   description: 'Invoices and payments'
    // }
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
      title: 'Profile',
      icon: User,
      path: '/hr/profile',
      description: 'Manage your profile'
    }
    // Commented out until backend integration is complete
    // {
    //   title: 'Employees',
    //   icon: Users,
    //   path: '/employees',
    //   description: 'Employee management',
    //   subItems: [
    //     { title: 'Employee Directory', path: '/employees/directory', icon: Users },
    //     { title: 'Onboarding', path: '/employees/onboarding', icon: UserCheck },
    //     { title: 'Performance Reviews', path: '/employees/reviews', icon: BarChart3 }
    //   ]
    // },
    // {
    //   title: 'Recruitment',
    //   icon: UserCheck,
    //   path: '/recruitment',
    //   description: 'Hiring and recruitment',
    //   subItems: [
    //     { title: 'Job Postings', path: '/recruitment/jobs', icon: FileText },
    //     { title: 'Applications', path: '/recruitment/applications', icon: Users },
    //     { title: 'Interview Schedule', path: '/recruitment/interviews', icon: Calendar }
    //   ]
    // },
    // {
    //   title: 'Leave Management',
    //   icon: Calendar,
    //   path: '/leave',
    //   description: 'Manage leave requests'
    // },
    // {
    //   title: 'Payroll Support',
    //   icon: DollarSign,
    //   path: '/payroll',
    //   description: 'Payroll coordination'
    // },
    // {
    //   title: 'HR Reports',
    //   icon: BarChart3,
    //   path: '/reports',
    //   description: 'HR analytics and reports'
    // }
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
      icon: Trello,
      path: '/employee/projects',
      description: 'My tasks and project boards'
    },
    {
      title: 'Profile',
      icon: User,
      path: '/employee/profile',
      description: 'Manage your profile'
    }
    // Commented out until backend integration is complete
    // {
    //   title: 'My Profile',
    //   icon: UserCheck,
    //   path: '/profile',
    //   description: 'View and update profile'
    // },
    // {
    //   title: 'Attendance',
    //   icon: Clock,
    //   path: '/attendance',
    //   description: 'Clock in/out and view history',
    //   subItems: [
    //     { title: 'Time Clock', path: '/attendance/clock', icon: Clock },
    //     { title: 'My Timesheet', path: '/attendance/timesheet', icon: Calendar },
    //     { title: 'Attendance History', path: '/attendance/history', icon: FileText }
    //   ]
    // },
    // {
    //   title: 'Leave Requests',
    //   icon: Calendar,
    //   path: '/leave',
    //   description: 'Request and manage leave'
    // },
    // {
    //   title: 'Pay Stubs',
    //   icon: DollarSign,
    //   path: '/paystubs',
    //   description: 'View pay stubs and tax documents'
    // },
    // {
    //   title: 'Company Directory',
    //   icon: Users,
    //   path: '/directory',
    //   description: 'Employee directory'
    // },
    // {
    //   title: 'Notifications',
    //   icon: Bell,
    //   path: '/notifications',
    //   description: 'Company announcements'
    // }
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