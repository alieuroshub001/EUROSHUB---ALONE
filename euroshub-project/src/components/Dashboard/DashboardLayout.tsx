'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, User, getRoleDashboardPath } from '@/lib/auth';
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
        console.log('DashboardLayout: Required role:', role);

        // Add delay to ensure cookie is properly set
        await new Promise(resolve => setTimeout(resolve, 100));

        const userData = await authAPI.getMe();
        console.log('DashboardLayout: getMe result:', userData);

        if (!userData) {
          console.log('DashboardLayout: No user data, redirecting to login');
          router.push('/');
          return;
        }

        // Check if user has the required role
        if (userData.role !== role) {
          console.log('🔒 DashboardLayout: Role mismatch. Expected:', role, 'Got:', userData.role);
          console.log('🔒 DashboardLayout: User data:', userData);
          // Redirect to user's correct dashboard instead of login
          const correctPath = getRoleDashboardPath(userData.role);
          console.log('🔒 DashboardLayout: Redirecting to correct dashboard:', correctPath);
          router.push(correctPath);
          return;
        }

        console.log('DashboardLayout: Authentication successful for user:', userData.firstName);
        setUser(userData);
      } catch (error) {
        console.error('DashboardLayout: Auth check failed:', error);

        // Add more specific error handling
        if (error instanceof Error) {
          console.error('DashboardLayout: Error details:', error.message);

          // Check for network errors specifically
          if (error.message.includes('Failed to fetch') || error.message.includes('Network error')) {
            console.error('DashboardLayout: Network error during auth check - server may be down or unreachable');
            console.error('DashboardLayout: API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');

            // Don't redirect to login immediately on network errors - give user a chance to retry
            return;
          }
        }

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