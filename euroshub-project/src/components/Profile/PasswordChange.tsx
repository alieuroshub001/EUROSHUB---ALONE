'use client';

import React, { useState } from 'react';
import { profileService, PasswordChangeRequest } from '@/lib/profileService';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PasswordChange() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'New password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation does not match';
    }

    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const passwordData: PasswordChangeRequest = {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      };

      await profileService.changePassword(passwordData);

      // Reset form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Show success message
      toast.success('Password changed successfully!');
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: Array<{ field: string; message: string }> };
      if (err.errors) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((apiErr: { field: string; message: string }) => {
          fieldErrors[apiErr.field] = apiErr.message;
        });
        setErrors(fieldErrors);
        toast.error('Please check the form for errors');
      } else {
        const errorMessage = err.message || 'Failed to change password';
        setErrors({ general: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];

    strength = checks.filter(Boolean).length;

    if (strength <= 2) return { label: 'Weak', color: 'text-red-600', bg: 'bg-red-200' };
    if (strength <= 3) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-200' };
    if (strength <= 4) return { label: 'Good', color: 'text-green-600', bg: 'bg-green-200' };
    return { label: 'Strong', color: 'text-green-700', bg: 'bg-green-300' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Password & Security</h3>
        <p className="text-gray-600 dark:text-gray-400">Update your password to keep your account secure.</p>
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
        <div className="bg-gray-50 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Change Password</h4>

          {/* Current Password */}
          <div className="relative mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                onFocus={() => handleFocus('currentPassword')}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 pr-12 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
                  errors.currentPassword
                    ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                    : focusedField === 'currentPassword'
                    ? 'border-[#17b6b2] focus:ring-[#17b6b2] bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="relative mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                onFocus={() => handleFocus('newPassword')}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 pr-12 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
                  errors.newPassword
                    ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                    : focusedField === 'newPassword'
                    ? 'border-[#17b6b2] focus:ring-[#17b6b2] bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPasswords.new ? (
                  <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Password Strength:</span>
                  <span className={`font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.bg}`}
                    style={{
                      width: `${Math.min((getPasswordStrength(formData.newPassword).label === 'Weak' ? 20 :
                                        getPasswordStrength(formData.newPassword).label === 'Fair' ? 40 :
                                        getPasswordStrength(formData.newPassword).label === 'Good' ? 70 : 100), 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            )}

            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.newPassword}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onFocus={() => handleFocus('confirmPassword')}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 pr-12 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
                  errors.confirmPassword
                    ? 'border-red-300 focus:ring-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                    : focusedField === 'confirmPassword'
                    ? 'border-[#17b6b2] focus:ring-[#17b6b2] bg-gray-50 dark:bg-gray-800'
                    : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                    ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
              {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-green-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Password Requirements:</h5>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li className="flex items-center">
              <svg className={`w-4 h-4 mr-2 ${formData.newPassword.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              At least 6 characters long
            </li>
            <li className="flex items-center">
              <svg className={`w-4 h-4 mr-2 ${/[a-z]/.test(formData.newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Contains lowercase letter (a-z)
            </li>
            <li className="flex items-center">
              <svg className={`w-4 h-4 mr-2 ${/[A-Z]/.test(formData.newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Contains uppercase letter (A-Z)
            </li>
            <li className="flex items-center">
              <svg className={`w-4 h-4 mr-2 ${/[0-9]/.test(formData.newPassword) ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Contains number (0-9)
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2 bg-[#17b6b2] hover:bg-[#15a09d] disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Changing Password...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Change Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}