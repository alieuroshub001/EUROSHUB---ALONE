'use client';

import React, { useState } from 'react';
import { UserProfile, ProfileUpdateRequest } from '@/lib/profileService';
import { AlertCircle, CheckCircle, Save, RotateCcw, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileInformationProps {
  profile: UserProfile;
  onUpdateProfile: (updateData: ProfileUpdateRequest) => Promise<UserProfile>;
}

export default function ProfileInformation({ profile, onUpdateProfile }: ProfileInformationProps) {
  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    employeeId: profile.employeeId || '',
    phone: profile.phone || '',
    department: profile.department || '',
    position: profile.position || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if user has privilege to edit certain fields
  const isPrivilegedUser = ['superadmin', 'admin', 'hr'].includes(profile.role);

  React.useEffect(() => {
    const checkChanges = () => {
      const hasChanged =
        formData.firstName !== profile.firstName ||
        formData.lastName !== profile.lastName ||
        formData.employeeId !== (profile.employeeId || '') ||
        formData.phone !== (profile.phone || '') ||
        formData.department !== (profile.department || '') ||
        formData.position !== (profile.position || '');

      setHasChanges(hasChanged);
    };

    checkChanges();
  }, [formData, profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!hasChanges) return;

    setLoading(true);
    try {
      // Only include changed fields
      const updateData: ProfileUpdateRequest = {};

      if (formData.firstName !== profile.firstName) updateData.firstName = formData.firstName.trim();
      if (formData.lastName !== profile.lastName) updateData.lastName = formData.lastName.trim();
      if (formData.phone !== (profile.phone || '')) updateData.phone = formData.phone.trim() || undefined;

      // Only include privileged fields if user has permission
      if (isPrivilegedUser) {
        if (formData.employeeId !== (profile.employeeId || '')) updateData.employeeId = formData.employeeId.trim() || undefined;
        if (formData.department !== (profile.department || '')) updateData.department = formData.department.trim() || undefined;
        if (formData.position !== (profile.position || '')) updateData.position = formData.position.trim() || undefined;
      }

      await onUpdateProfile(updateData);

      // Show success message
      toast.success('Profile updated successfully!');
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: Array<{ field: string; message: string }> };
      if (err.errors) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((apiErr: { field: string; message: string }) => {
          fieldErrors[apiErr.field] = apiErr.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err.message || 'Failed to update profile' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      employeeId: profile.employeeId || '',
      phone: profile.phone || '',
      department: profile.department || '',
      position: profile.position || '',
    });
    setErrors({});
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Personal Information</h3>
        <p className="text-gray-500 dark:text-gray-400">Update your personal details and contact information.</p>
      </div>

      {errors.general && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" strokeWidth={1.5} />
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                onFocus={() => handleFocus('firstName')}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                  errors.firstName
                    ? 'border-red-300 focus:border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:focus:border-red-500'
                    : focusedField === 'firstName'
                    ? 'border-[#17b6b2] bg-gray-50 dark:bg-gray-800 dark:border-[#17b6b2]'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
                placeholder="Enter first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" strokeWidth={1.5} />
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

          {/* Employee ID - Only visible to privileged users */}
          {isPrivilegedUser && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
                <span className="text-xs text-blue-600 ml-2">(Admin/HR only)</span>
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                onFocus={() => handleFocus('employeeId')}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                  focusedField === 'employeeId'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder="Enter employee ID"
                maxLength={20}
              />
            </div>
          )}
        </div>

        {/* Work Information */}
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Work Information</h4>
            {!isPrivilegedUser && (
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                Read-only for employees
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
                {!isPrivilegedUser && <span className="text-xs text-gray-500 ml-2">(Admin/HR only)</span>}
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                onFocus={() => handleFocus('department')}
                onBlur={handleBlur}
                disabled={!isPrivilegedUser}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                  !isPrivilegedUser
                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                    : focusedField === 'department'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder={isPrivilegedUser ? "e.g., Engineering, Marketing" : "Contact admin to update"}
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
                {!isPrivilegedUser && <span className="text-xs text-gray-500 ml-2">(Admin/HR only)</span>}
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                onFocus={() => handleFocus('position')}
                onBlur={handleBlur}
                disabled={!isPrivilegedUser}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${
                  !isPrivilegedUser
                    ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                    : focusedField === 'position'
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder={isPrivilegedUser ? "e.g., Senior Developer" : "Contact admin to update"}
              />
            </div>
          </div>

          {!isPrivilegedUser && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Work Information Restrictions</p>
                  <p>Only administrators and HR can update department and position information. Contact your HR department if these details need to be updated.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Information (Read-only) */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Account Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Email:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{profile.email}</span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Role:</span>
              <span className="ml-2 text-gray-900 dark:text-white capitalize">{profile.role}</span>
            </div>
            {profile.employeeId && (
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">Employee ID:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{profile.employeeId}</span>
              </div>
            )}
            <div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Status:</span>
              <span className={`ml-2 flex items-center gap-1 ${profile.isActive ? 'text-[#17b6b2]' : 'text-red-600 dark:text-red-400'}`}>
                <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                {profile.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Email Verified:</span>
              <span className={`ml-2 flex items-center gap-1 ${profile.isEmailVerified ? 'text-[#17b6b2]' : 'text-orange-600 dark:text-orange-400'}`}>
                <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                {profile.isEmailVerified ? 'Yes' : 'Pending'}
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Member Since:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Last Login:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {profile.lastLogin ? new Date(profile.lastLogin).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {hasChanges && (
              <div className="flex items-center text-[#17b6b2] text-sm mr-4">
                <Info className="w-4 h-4 mr-1" strokeWidth={1.5} />
                Unsaved changes
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
              Reset
            </button>

            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#17b6b2] text-white font-medium rounded-lg hover:bg-[#15a09d] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" strokeWidth={1.5} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}