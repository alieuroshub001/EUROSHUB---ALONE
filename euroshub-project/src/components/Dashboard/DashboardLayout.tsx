'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, User } from '@/lib/auth';
import Sidebar from '@/components/Global/Sidebar/Sidebar';
import Header from '@/components/Global/Header/Header';
import NavigationProvider from '@/components/Global/Navigation/NavigationProvider';
import LoadingSpinner from '@/components/Global/LoadingSpinner/LoadingSpinner';
import { UserRole } from '@/components/Global/Sidebar/SidebarLinks';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  title?: string;
  showBreadcrumb?: boolean;
  breadcrumbs?: string[];
}

export default function DashboardLayout({ 
  children, 
  role, 
  title,
  showBreadcrumb = true,
  breadcrumbs = []
}: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('DashboardLayout: Checking authentication...');
        const userData = await authAPI.getMe();
        console.log('DashboardLayout: getMe result:', userData);

        if (!userData) {
          console.log('DashboardLayout: No user data, redirecting to login');
          router.push('/');
          return;
        }

        // Check if user has the required role
        if (userData.role !== role) {
          console.log('DashboardLayout: Role mismatch. Expected:', role, 'Got:', userData.role);
          router.push('/');
          return;
        }

        console.log('DashboardLayout: Authentication successful for user:', userData.firstName);
        setUser(userData);
      } catch (error) {
        console.error('DashboardLayout: Auth check failed:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [role, router]);

  const handleSidebarToggle = useCallback(() => {
    // Mobile sidebar toggle is handled internally by Sidebar component
  }, []);

  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

  if (loading) {
    return <LoadingSpinner isLoading={true} />;
  }

  if (!user) {
    return null;
  }

  return (
    <NavigationProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar 
          isOpen={true}
          onToggle={handleSidebarToggle}
          onCollapseChange={handleCollapseChange}
        />
        
        <div className={`flex flex-col transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}>
          <Header 
            onSidebarToggle={handleSidebarToggle}
            isCollapsed={sidebarCollapsed}
            title={title}
            showBreadcrumb={showBreadcrumb}
            breadcrumbs={breadcrumbs}
          />
          
          <main className="flex-1 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}