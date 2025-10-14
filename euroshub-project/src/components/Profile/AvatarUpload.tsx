'use client';

import React, { useState, useRef } from 'react';
import { UserProfile, profileService } from '@/lib/profileService';
import toast from 'react-hot-toast';

interface AvatarUploadProps {
  profile: UserProfile;
  onAvatarUpdate: (updatedProfile: UserProfile) => void;
  onAvatarDelete: (updatedProfile: UserProfile) => void;
}

export default function AvatarUpload({ profile, onAvatarUpdate, onAvatarDelete }: AvatarUploadProps) {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please select an image file';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      const errorMsg = 'File size must be less than 5MB';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const updatedProfile = await profileService.uploadAvatar(file);
      onAvatarUpdate(updatedProfile);
      toast.success('Profile picture uploaded successfully!');
    } catch (err: unknown) {
      const error = err as { message: string };
      const errorMessage = error.message || 'Failed to upload profile picture';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDeleteAvatar = async () => {
    if (!profile.avatar) return;

    // Show confirmation toast
    const confirmDelete = () => {
      setLoading(true);
      const deletePromise = profileService.deleteAvatar();
      
      toast.promise(
        deletePromise,
        {
          loading: 'Deleting profile picture...',
          success: 'Profile picture deleted successfully!',
          error: 'Failed to delete profile picture'
        }
      );

      deletePromise
        .then((updatedProfile) => {
          onAvatarDelete(updatedProfile);
        })
        .catch((err: unknown) => {
          const error = err as { message: string };
          setError(error.message);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    // Custom confirmation toast
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Delete your profile picture?</span>
          <div className="flex gap-2">
            <button
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
              onClick={() => {
                toast.dismiss(t.id);
                confirmDelete();
              }}
            >
              Delete
            </button>
            <button
              className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 transition-colors"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        icon: '🗑️',
      }
    );
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Picture</h3>
        <p className="text-gray-600">Upload a photo to personalize your profile.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-6">
        {/* Current Avatar */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="relative group">
            {profile.avatar ? (
              // User has avatar - display image with enhanced visibility
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-3 hover:ring-blue-400 dark:hover:ring-blue-500 transition-all duration-200 hover:scale-105">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-full h-full rounded-full object-cover filter brightness-105 contrast-110 saturate-110"
                />
              </div>
            ) : (
              // User has no avatar - display initials with enhanced styling
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-xl ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-3 hover:ring-blue-400 dark:hover:ring-blue-500 transition-all duration-200 hover:scale-105 bg-gradient-to-br from-[#17b6b2] to-[#15a09d]">
                <span className="text-2xl font-bold text-white">
                  {profile.firstName[0]}{profile.lastName[0]}
                </span>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h4 className="text-md font-semibold text-gray-900 mb-2">
              {profile.firstName} {profile.lastName}
            </h4>
            <p className="text-gray-600 text-sm mb-3">
              {profile.avatar ? 'Click to update your profile picture' : 'No profile picture set'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={openFileDialog}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {profile.avatar ? 'Change Photo' : 'Upload Photo'}
              </button>
              {profile.avatar && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <div className="cursor-pointer">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {dragOver ? 'Drop your image here' : 'Drag and drop your image'}
            </p>
            <p className="text-gray-600 mb-4">
              or <span className="text-blue-600 font-medium">click to browse</span>
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, GIF up to 5MB
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Guidelines */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h5 className="text-sm font-semibold text-blue-900 mb-2">Photo Guidelines:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Use a clear, recent photo of yourself
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Square images work best (will be cropped to circle)
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Keep it professional and appropriate
          </li>
          <li className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Maximum file size: 5MB
          </li>
        </ul>
      </div>
    </div>
  );
}