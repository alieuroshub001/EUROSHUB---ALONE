'use client';

import React, { useState, useEffect } from 'react';
import { User as AuthUser } from '@/lib/auth';
import { profileService, UserProfile, ProfileUpdateRequest } from '@/lib/profileService';
import { User, Key, Image, AlertCircle, CheckCircle } from 'lucide-react';
import ProfileInformation from './ProfileInformation';
import PasswordChange from './PasswordChange';
import AvatarUpload from './AvatarUpload';

interface ProfileManagementProps {
  currentUser: AuthUser;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ProfileManagement({ currentUser }: ProfileManagementProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'avatar'>('profile');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await profileService.getProfile();
      setProfile(profileData);
    } catch (err: unknown) {
      const error = err as { message: string };
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updateData: ProfileUpdateRequest) => {
    try {
      const updatedProfile = await profileService.updateProfile(updateData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (error: unknown) {
      throw error;
    }
  };

  const handleAvatarUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const handleAvatarDelete = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-gray-200 border-t-[#17b6b2] rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to load profile</h3>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadProfile}
            className="px-6 py-2 bg-[#17b6b2] text-white rounded-lg hover:bg-[#15a09d] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto border border-gray-200 dark:border-gray-700">
            <User className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Profile not found</h3>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'password', label: 'Password & Security', icon: Key },
    { id: 'avatar', label: 'Profile Picture', icon: Image },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
            <User className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
            Profile Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'profile'
              ? 'Update your personal information and contact details'
              : activeTab === 'password'
              ? 'Change your password and manage security settings'
              : 'Upload and manage your profile picture'
            }
          </p>
        </div>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-2">{profile.email}</p>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium capitalize">
                {profile.role}
              </span>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-[#17b6b2]" strokeWidth={1.5} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-1">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#17b6b2] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <IconComponent className="w-5 h-5" strokeWidth={1.5} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <ProfileInformation
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
        />
      )}
      {activeTab === 'password' && (
        <PasswordChange />
      )}
      {activeTab === 'avatar' && (
        <AvatarUpload
          profile={profile}
          onAvatarUpdate={handleAvatarUpdate}
          onAvatarDelete={handleAvatarDelete}
        />
      )}
    </div>
  );
}