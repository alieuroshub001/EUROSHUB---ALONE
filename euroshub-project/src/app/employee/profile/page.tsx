'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProfileManagement from '@/components/Profile/ProfileManagement';
import { authAPI, User } from '@/lib/auth';
import LoadingSpinner from '@/components/Global/LoadingSpinner/LoadingSpinner';

export default function EmployeeProfilePage() {
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
      role="employee"
      title="Profile Settings"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Profile']}
    >
      <div className="space-y-6">
      <ProfileManagement currentUser={currentUser} />
      </div>
    </DashboardLayout>
  );
}