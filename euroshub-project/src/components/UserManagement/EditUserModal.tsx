'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/userService';
import { User as AuthUser } from '@/lib/auth';
import { getAvailableRoles, canCreateRole } from '@/lib/permissions';
import { UpdateUserRequest } from '@/lib/userService';

interface EditUserModalProps {
  user: User;
  currentUser: AuthUser;
  onClose: () => void;
  onUpdateUser: (userData: UpdateUserRequest) => Promise<void>;
}

export default function EditUserModal({ user, currentUser, onClose, onUpdateUser }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    department: user.department || '',
    position: user.position || '',
    isActive: user.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const availableRoles = getAvailableRoles(currentUser.role);
  const canChangeRole = currentUser.role === 'superadmin' ||
    (currentUser.role !== user.role && canCreateRole(currentUser.role, formData.role));

  useEffect(() => {
    const checkChanges = () => {
      const hasChanged =
        formData.firstName !== user.firstName ||
        formData.lastName !== user.lastName ||
        formData.email !== user.email ||
        formData.role !== user.role ||
        formData.phone !== (user.phone || '') ||
        formData.department !== (user.department || '') ||
        formData.position !== (user.position || '') ||
        formData.isActive !== user.isActive;

      setHasChanges(hasChanged);
    };

    checkChanges();
  }, [formData, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFocus = (fieldName: string) => {
    setFocusedField(fieldName);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!hasChanges) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Only include changed fields
      const updateData: UpdateUserRequest = {
        id: user.id,
      };

      if (formData.firstName !== user.firstName) updateData.firstName = formData.firstName.trim();
      if (formData.lastName !== user.lastName) updateData.lastName = formData.lastName.trim();
      if (formData.email !== user.email) updateData.email = formData.email.trim().toLowerCase();
      if (formData.role !== user.role && canChangeRole) updateData.role = formData.role;
      if (formData.phone !== (user.phone || '')) updateData.phone = formData.phone.trim() || undefined;
      if (formData.department !== (user.department || '')) updateData.department = formData.department.trim() || undefined;
      if (formData.position !== (user.position || '')) updateData.position = formData.position.trim() || undefined;
      if (formData.isActive !== user.isActive) updateData.isActive = formData.isActive;

      await onUpdateUser(updateData);
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: Array<{ field: string; message: string }> };
      if (err.errors) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((apiErr: { field: string; message: string }) => {
          fieldErrors[apiErr.field] = apiErr.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err.message || 'Failed to update user' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = (role: string) => {
    const roleInfo: Record<string, { color: string; bg: string; description: string }> = {
      superadmin: {
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        description: 'Full system access and control'
      },
      admin: {
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        description: 'Administrative privileges and user management'
      },
      hr: {
        color: 'text-purple-700',
        bg: 'bg-purple-50 border-purple-200',
        description: 'Human resources and employee management'
      },
      employee: {
        color: 'text-green-700',
        bg: 'bg-green-50 border-green-200',
        description: 'Standard employee access'
      },
      client: {
        color: 'text-orange-700',
        bg: 'bg-orange-50 border-orange-200',
        description: 'Client portal access'
      }
    };
    return roleInfo[role] || roleInfo.employee;
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {user.firstName[0]}{user.lastName[0]}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Edit User Profile</h2>
                <p className="text-blue-100 text-sm">Update {user.firstName} {user.lastName}&apos;s information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Indicators */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-blue-100 text-sm">
                {user.isActive ? 'Active Account' : 'Inactive Account'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${user.isEmailVerified ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-blue-100 text-sm">
                {user.isEmailVerified ? 'Email Verified' : 'Email Pending'}
              </span>
            </div>
            {hasChanges && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-blue-100 text-sm">Unsaved Changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 p-6 space-y-8">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.general}
                </div>
              )}

              {/* Personal Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                    <p className="text-gray-600 text-sm">Basic personal details and contact information</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('firstName')}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        errors.firstName
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : focusedField === 'firstName'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('lastName')}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        errors.lastName
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : focusedField === 'lastName'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('email')}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        errors.email
                          ? 'border-red-300 focus:border-red-500 bg-red-50'
                          : focusedField === 'email'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('phone')}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        focusedField === 'phone'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Access Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Role & Access Control</h3>
                    <p className="text-gray-600 text-sm">System permissions and account status</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      User Role *
                    </label>
                    {canChangeRole ? (
                      <div className="space-y-3">
                        {availableRoles.map(role => {
                          const roleInfo = getRoleInfo(role);
                          return (
                            <div
                              key={role}
                              className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                                formData.role === role
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => setFormData(prev => ({ ...prev, role }))}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  name="role"
                                  value={role}
                                  checked={formData.role === role}
                                  onChange={handleInputChange}
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-gray-900 capitalize">{role}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${roleInfo.bg} ${roleInfo.color}`}>
                                      {role === 'superadmin' ? 'Full' : role === 'admin' ? 'High' : role === 'hr' ? 'HR' : role === 'employee' ? 'Standard' : 'Limited'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{roleInfo.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`border-2 rounded-xl p-4 bg-gray-100 ${getRoleInfo(user.role).bg}`}>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900 capitalize">{user.role}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleInfo(user.role).bg} ${getRoleInfo(user.role).color}`}>
                                Current Role
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{getRoleInfo(user.role).description}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          You don&apos;t have permission to change this user&apos;s role
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Account Status
                    </label>
                    <div className="space-y-3">
                      <div
                        className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                          formData.isActive
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, isActive: true }))}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="isActive"
                            checked={formData.isActive === true}
                            onChange={() => setFormData(prev => ({ ...prev, isActive: true }))}
                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">Active</span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                Enabled
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">User can access the system</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                          !formData.isActive
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, isActive: false }))}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="isActive"
                            checked={formData.isActive === false}
                            onChange={() => setFormData(prev => ({ ...prev, isActive: false }))}
                            className="w-4 h-4 text-red-600 focus:ring-red-500"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900">Inactive</span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                Disabled
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">User access is suspended</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Work Information</h3>
                    <p className="text-gray-600 text-sm">Department and position details</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('department')}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        focusedField === 'department'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="e.g., Engineering, Marketing"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('position')}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                        focusedField === 'position'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      placeholder="e.g., Senior Developer"
                    />
                  </div>
                </div>
              </div>

              {/* Account Metadata */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Created:</span>
                    <span className="ml-2 text-blue-900">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Last Login:</span>
                    <span className="ml-2 text-blue-900">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <div className="flex space-x-3">
                {hasChanges && (
                  <div className="flex items-center text-sm text-amber-600 mr-4">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Unsaved changes
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !hasChanges}
                  className="px-8 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update User
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}