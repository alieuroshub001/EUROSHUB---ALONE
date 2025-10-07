'use client';

import React, { useState, useEffect } from 'react';
import { User as AuthUser } from '@/lib/auth';
import { getAvailableRoles } from '@/lib/permissions';
import { CreateUserRequest } from '@/lib/userService';
import { UserPlus, User, Mail, Phone, Briefcase, Building2, BadgeCheck, Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface CreateUserFormProps {
  currentUser: AuthUser;
  onCreateUser: (userData: CreateUserRequest) => Promise<void>;
  onCancel: () => void;
}

export default function CreateUserForm({ currentUser, onCreateUser, onCancel }: CreateUserFormProps) {
  const [formData, setFormData] = useState<CreateUserRequest>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'employee',
    employeeId: '',
    phone: '',
    department: '',
    position: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formProgress, setFormProgress] = useState(0);

  const availableRoles = getAvailableRoles(currentUser.role);

  useEffect(() => {
    const calculateProgress = () => {
      const totalFields = 8;
      const filledFields = Object.values(formData).filter(value => value && value.trim() !== '').length;
      return Math.round((filledFields / totalFields) * 100);
    };
    setFormProgress(calculateProgress());
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

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

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const cleanedData = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        employeeId: formData.employeeId?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        department: formData.department?.trim() || undefined,
        position: formData.position?.trim() || undefined,
      };

      await onCreateUser(cleanedData);
      
      // Reset form after successful creation
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'employee',
        employeeId: '',
        phone: '',
        department: '',
        position: '',
      });
      setErrors({});
    } catch (error: unknown) {
      const err = error as { message?: string; errors?: Array<{ field: string; message: string }> };
      if (err.errors) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((apiErr: { field: string; message: string }) => {
          fieldErrors[apiErr.field] = apiErr.message;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: err.message || 'Failed to create user' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return Shield;
      case 'admin':
        return BadgeCheck;
      case 'hr':
        return User;
      case 'employee':
        return Briefcase;
      case 'client':
        return Building2;
      default:
        return User;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New User</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Add a new team member to your organization</p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Form Progress</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{formProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 dark:bg-gray-300 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${formProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="ml-3 text-sm font-medium text-red-800 dark:text-red-200">{errors.general}</p>
          </div>
        </div>
      )}

      {/* Personal Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Basic details and contact information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              onFocus={() => handleFocus('firstName')}
              onBlur={handleBlur}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                errors.firstName
                  ? 'border-red-500 focus:ring-red-500'
                  : focusedField === 'firstName'
                  ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              onFocus={() => handleFocus('lastName')}
              onBlur={handleBlur}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                errors.lastName
                  ? 'border-red-500 focus:ring-red-500'
                  : focusedField === 'lastName'
                  ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.lastName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                onFocus={() => handleFocus('email')}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : focusedField === 'email'
                    ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="john.doe@company.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onFocus={() => handleFocus('phone')}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  focusedField === 'phone'
                    ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role & Access Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role & Permissions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Define system access and privileges</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Select User Role <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRoles.map(role => {
              const RoleIcon = getRoleIcon(role);
              return (
                <div
                  key={role}
                  className={`relative rounded-lg p-4 cursor-pointer transition-all border-2 ${
                    formData.role === role
                      ? 'border-gray-900 dark:border-gray-300 bg-gray-50 dark:bg-gray-700'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, role }))}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.role === role
                        ? 'border-gray-900 dark:border-gray-300 bg-gray-900 dark:bg-gray-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                    }`}>
                      {formData.role === role && (
                        <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <RoleIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        <span className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                          {role}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                          {role === 'superadmin' ? 'Full' :
                           role === 'admin' ? 'High' :
                           role === 'hr' ? 'HR' :
                           role === 'employee' ? 'Standard' : 'Limited'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {role === 'superadmin' ? 'Complete system control with all privileges' :
                         role === 'admin' ? 'Manage users, settings, and resources' :
                         role === 'hr' ? 'Handle employee records and HR operations' :
                         role === 'employee' ? 'Access standard features and workspace' :
                         'Limited access to client-specific features'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {errors.role && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 flex items-center font-medium">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {errors.role}
            </p>
          )}
        </div>
      </div>

      {/* Work Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Work Information</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Organizational details and position</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Employee ID <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              onFocus={() => handleFocus('employeeId')}
              onBlur={handleBlur}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                focusedField === 'employeeId'
                  ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="EMP001"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Department <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                onFocus={() => handleFocus('department')}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  focusedField === 'department'
                    ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Engineering"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Position <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              onFocus={() => handleFocus('position')}
              onBlur={handleBlur}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                focusedField === 'position'
                  ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Senior Developer"
            />
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Security & Account Setup</h4>
            <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span>Secure credentials will be automatically generated</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span>Welcome email with login details will be sent</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span>User must verify email and set new password on first login</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <span>Fields marked with <span className="text-red-500 font-semibold">*</span> are required</span>
          </div>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none px-8 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white dark:text-gray-900 font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create User Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}