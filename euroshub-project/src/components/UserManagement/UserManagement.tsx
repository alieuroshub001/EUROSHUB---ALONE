'use client';

import React, { useState, useEffect } from 'react';
import { User, CreateUserRequest, UpdateUserRequest } from '@/lib/userService';
import { getPermissions, hasUserManagementAccess } from '@/lib/permissions';
import { User as AuthUser } from '@/lib/auth';
import { userService } from '@/lib/userService';
import { Users, UserPlus, Key, Shield, CheckCircle, AlertCircle, Crown } from 'lucide-react';
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
        alert('User created successfully! Credentials have been sent to their email.');
      } else {
        alert(`User created successfully! Email failed to send. Temporary password: ${result.temporaryPassword}`);
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
      alert('User updated successfully!');
    } catch (err: unknown) {
      throw err; // Let the modal handle the error
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      setDeletingUser(null);
      alert('User deleted successfully!');
    } catch (err: unknown) {
      const error = err as { message: string };
      alert(`Failed to delete user: ${error.message}`);
    }
  };

  // Check if current user has access to user management
  if (!hasUserManagementAccess(currentUser.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="text-gray-500 dark:text-gray-400">You don&apos;t have permission to access user management.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to load users</h3>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadUsers}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
          >
            <UserPlus className="w-5 h-5" />
            Add New User
          </button>
        )}
      </div>

      {/* Modern Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-2">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">All Users</span>
            <span className="sm:hidden">Users</span>
          </button>

          {permissions.canCreateUsers && (
            <button
              onClick={() => setActiveTab('add-user')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'add-user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add User</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('password-resets')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'password-resets'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Key className="w-5 h-5" />
            <span className="hidden sm:inline">Password Resets</span>
            <span className="sm:hidden">Resets</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Modern Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">+0 this week</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <div className="mt-2 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20"></div>
            </div>

            {/* Active Users */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.isActive).length}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{Math.round((users.filter(u => u.isActive).length / users.length) * 100)}% active</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <div className="mt-2 h-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full opacity-20"></div>
            </div>

            {/* Pending Verification */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-yellow-300 dark:hover:border-yellow-700 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => !u.isEmailVerified).length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">awaiting verify</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Verification</p>
              <div className="mt-2 h-1 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full opacity-20"></div>
            </div>

            {/* Admins */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'admin' || u.role === 'superadmin').length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">elevated access</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
              <div className="mt-2 h-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full opacity-20"></div>
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