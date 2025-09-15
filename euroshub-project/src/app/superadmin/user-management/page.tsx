'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import UserManagement from '@/components/UserManagement/UserManagement';
import { authAPI, User } from '@/lib/auth';
import LoadingSpinner from '@/components/Global/LoadingSpinner/LoadingSpinner';

export default function SuperAdminUserManagementPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await authAPI.getMe();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return <LoadingSpinner isLoading={true} />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <DashboardLayout
      role="superadmin"
      title="User Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'User Management']}
    >
      <UserManagement currentUser={currentUser} />
    </DashboardLayout>
  );
}