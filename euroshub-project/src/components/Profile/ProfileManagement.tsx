'use client';

import React, { useState, useEffect } from 'react';
import { User as AuthUser } from '@/lib/auth';
import { profileService, UserProfile, ProfileUpdateRequest } from '@/lib/profileService';
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Profile</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadProfile}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-800">Profile not found</h3>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: '👤' },
    { id: 'password', label: 'Password & Security', icon: '🔒' },
    { id: 'avatar', label: 'Profile Picture', icon: '📷' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">
                {profile.firstName[0]}{profile.lastName[0]}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-blue-100">{profile.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                {profile.role}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                profile.isActive ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
              }`}>
                {profile.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
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
      </div>
    </div>
  );
}