'use client';

import React, { useState } from 'react';
import { UserProfile, ProfileUpdateRequest } from '@/lib/profileService';

interface ProfileInformationProps {
  profile: UserProfile;
  onUpdateProfile: (updateData: ProfileUpdateRequest) => Promise<UserProfile>;
}

export default function ProfileInformation({ profile, onUpdateProfile }: ProfileInformationProps) {
  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone || '',
    department: profile.department || '',
    position: profile.position || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    const checkChanges = () => {
      const hasChanged =
        formData.firstName !== profile.firstName ||
        formData.lastName !== profile.lastName ||
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
      if (formData.department !== (profile.department || '')) updateData.department = formData.department.trim() || undefined;
      if (formData.position !== (profile.position || '')) updateData.position = formData.position.trim() || undefined;

      await onUpdateProfile(updateData);

      // Show success message
      alert('Profile updated successfully!');
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
      phone: profile.phone || '',
      department: profile.department || '',
      position: profile.position || '',
    });
    setErrors({});
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
        <p className="text-gray-600">Update your personal details and contact information.</p>
      </div>

      {errors.general && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Basic Information</h4>

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

        {/* Work Information */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Work Information</h4>

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

        {/* Account Information (Read-only) */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="text-md font-semibold text-blue-900 mb-4">Account Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Email:</span>
              <span className="ml-2 text-blue-900">{profile.email}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Role:</span>
              <span className="ml-2 text-blue-900 capitalize">{profile.role}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Status:</span>
              <span className={`ml-2 ${profile.isActive ? 'text-green-700' : 'text-red-700'}`}>
                {profile.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Email Verified:</span>
              <span className={`ml-2 ${profile.isEmailVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                {profile.isEmailVerified ? 'Yes' : 'Pending'}
              </span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Member Since:</span>
              <span className="ml-2 text-blue-900">
                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Last Login:</span>
              <span className="ml-2 text-blue-900">
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
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="flex items-center">
            {hasChanges && (
              <div className="flex items-center text-amber-600 text-sm mr-4">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Unsaved changes
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || loading}
              className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="px-8 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
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