'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authAPI } from '@/lib/auth';

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = params.token as string;
        console.log('🔍 Verification token:', token);
        console.log('🔍 API Base URL:', process.env.NEXT_PUBLIC_API_URL);

        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link');
          return;
        }

        console.log('📧 Calling verification API...');
        const response = await authAPI.verifyEmail(token);
        console.log('📧 Verification response:', response);

        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          console.log('🔄 Redirecting to login page...');
          router.push('/');
        }, 3000);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('❌ Verification error:', error);
        setStatus('error');
        setMessage(err.message || 'Email verification failed');
      }
    };

    verifyEmail();
  }, [params.token, router]);

  const handleGoToLogin = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-2xl rounded-lg px-8 pt-6 pb-8">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="animate-spin w-8 h-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h1>
                <p className="text-gray-600">Please wait while we verify your email address...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-700">
                    ✅ Your email has been successfully verified. You can now log in to your account.
                  </p>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Redirecting to login page in 3 seconds...
                </p>
                <button
                  onClick={handleGoToLogin}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Continue to Login
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h1>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-700">
                    ❌ The verification link may be invalid or expired. Please try requesting a new verification email.
                  </p>
                </div>
                <button
                  onClick={handleGoToLogin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}