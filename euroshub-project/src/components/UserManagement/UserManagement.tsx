'use client';

import React, { useState, useEffect } from 'react';
import { User, CreateUserRequest, UpdateUserRequest } from '@/lib/userService';
import { getPermissions, hasUserManagementAccess } from '@/lib/permissions';
import { User as AuthUser } from '@/lib/auth';
import { userService } from '@/lib/userService';
import { Users, UserPlus, Key, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import UserList from './UserList';
import CreateUserForm from './CreateUserForm';
import EditUserModal from './EditUserModal';
import DeleteUserModal from './DeleteUserModal';
import PasswordResetManagement from './PasswordResetManagement';

interface UserManagementProps {
  currentUser: AuthUser;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'add-user' | 'password-resets'>('users');

  const permissions = getPermissions(currentUser.role);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
    } catch (err: unknown) {
      const error = err as { message: string };
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: CreateUserRequest) => {
    try {
      const result = await userService.createUser(userData);
      setUsers([...users, result.user]);

      // Show success message with email status
      if (result.emailSent) {
        toast.success(`User ${result.user.firstName} ${result.user.lastName} created successfully. Credentials sent to ${result.user.email}`, {
          duration: 5000,
        });
      } else {
        toast.success(`User created successfully. Email failed to send. Temporary password: ${result.temporaryPassword}`, {
          duration: 7000,
        });
      }

      // Switch back to users tab after successful creation
      setActiveTab('users');
    } catch (err: unknown) {
      throw err; // Let the form handle the error
    }
  };

  const handleUpdateUser = async (userData: UpdateUserRequest) => {
    try {
      const updatedUser = await userService.updateUser(userData);
      setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
      setEditingUser(null);
      toast.success(`User ${updatedUser.firstName} ${updatedUser.lastName} updated successfully`);
    } catch (err: unknown) {
      throw err; // Let the modal handle the error
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      const deletedUser = deletingUser;
      setUsers(users.filter(user => user.id !== userId));
      setDeletingUser(null);
      toast.success(`User ${deletedUser?.firstName || ''} ${deletedUser?.lastName || ''} deleted successfully`);
    } catch (err: unknown) {
      const error = err as { message: string };
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  // Check if current user has access to user management
  if (!hasUserManagementAccess(currentUser.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <Shield className="w-10 h-10 text-[#17b6b2]" strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="text-gray-500 dark:text-gray-400">You don&apos;t have permission to access user management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-gray-200 border-t-[#17b6b2] rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto border border-gray-200 dark:border-gray-700">
            <AlertCircle className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to load users</h3>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadUsers}
            className="px-6 py-2 bg-[#17b6b2] text-white rounded-lg hover:bg-[#15a09d] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
            <Users className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
            User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'users'
              ? 'Manage users and their permissions'
              : activeTab === 'add-user'
              ? 'Create a new user account'
              : 'Review and process password reset requests'
            }
          </p>
        </div>
        {permissions.canCreateUsers && activeTab === 'users' && (
          <button
            onClick={() => setActiveTab('add-user')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17b6b2] text-white font-medium rounded-lg hover:bg-[#15a09d] transition-colors"
          >
            <UserPlus className="w-5 h-5" strokeWidth={1.5} />
            Add New User
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-1">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-[#17b6b2] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">All Users</span>
            <span className="sm:hidden">Users</span>
          </button>

          {permissions.canCreateUsers && (
            <button
              onClick={() => setActiveTab('add-user')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'add-user'
                  ? 'bg-[#17b6b2] text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <UserPlus className="w-5 h-5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('password-resets')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'password-resets'
                ? 'bg-[#17b6b2] text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Key className="w-5 h-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Password Resets</span>
            <span className="sm:hidden">Resets</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <Users className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{users.length}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
            </div>

            {/* Active Users */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <CheckCircle className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{users.filter(u => u.isActive).length}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
            </div>

            {/* Pending Verification */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <AlertCircle className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{users.filter(u => !u.isEmailVerified).length}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Verification</p>
            </div>

            {/* Admins */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  <Shield className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
            </div>
          </div>

          {/* User List */}
          <UserList
            users={users}
            currentUser={currentUser}
            onEditUser={setEditingUser}
            onDeleteUser={setDeletingUser}
          />
        </>
      )}

      {activeTab === 'add-user' && permissions.canCreateUsers && (
        <CreateUserForm
          currentUser={currentUser}
          onCreateUser={handleCreateUser}
          onCancel={() => setActiveTab('users')}
        />
      )}

      {activeTab === 'password-resets' && (
        <PasswordResetManagement currentUser={currentUser} />
      )}

      {/* Modals */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          currentUser={currentUser}
          onClose={() => setEditingUser(null)}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleteUser={handleDeleteUser}
        />
      )}
    </div>
  );
}