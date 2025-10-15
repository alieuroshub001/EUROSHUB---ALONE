'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { authAPI, getRoleDashboardPath } from '@/lib/auth';

interface LoginFormProps {
  onSuccess?: () => void;
}

function LoginFormContent({ onSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for session expiration on mount
  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      setSessionExpired(true);
      // Clear the URL parameter
      router.replace('/');
    }
  }, [searchParams, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await authAPI.login(formData.email, formData.password);

      if (response.success) {
        console.log('LoginForm: Login successful, user role:', response.data.user.role);

        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect to role-specific dashboard
        const dashboardPath = getRoleDashboardPath(response.data.user.role);
        console.log('LoginForm: Redirecting to:', dashboardPath);

        router.push(dashboardPath);

        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: unknown) {
      const error = err as {
        errors?: Array<{ path?: string; msg: string }>;
        message?: string;
        requiresEmailVerification?: boolean;
        email?: string;
      };

      if (error.requiresEmailVerification) {
        setUserEmail(error.email || formData.email);
        setShowEmailVerification(true);
        setError(''); // Clear login error when showing verification
      } else if (error.errors && Array.isArray(error.errors)) {
        // Handle field-specific validation errors
        const errors: Record<string, string> = {};
        error.errors.forEach((validationError) => {
          if (validationError.path) {
            errors[validationError.path] = validationError.msg;
          }
        });
        setFieldErrors(errors);
      } else {
        // Handle general error
        setError(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage('');

    try {
      await authAPI.resendVerificationEmail(userEmail);
      setResendMessage('Verification email sent successfully! Please check your inbox.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setResendMessage(error.message || 'Failed to send verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordError('');
    setForgotPasswordMessage('');

    try {
      const response = await authAPI.requestPasswordReset(forgotPasswordEmail);
      setForgotPasswordMessage(response.message || 'Password reset request sent to administrators for approval.');
      setForgotPasswordEmail('');
    } catch (error: unknown) {
      const err = error as { message?: string };
      setForgotPasswordError(err.message || 'Failed to send password reset request');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail('');
    setForgotPasswordMessage('');
    setForgotPasswordError('');
  };

  const handleBackToLogin = () => {
    setShowEmailVerification(false);
    setResendMessage('');
    setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (showEmailVerification) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl px-8 pt-8 pb-8 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-teal-100 dark:bg-teal-800/30 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Verify Your Email</h1>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Please check your email and click the verification link to activate your account
            </p>
          </div>

          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-teal-800 dark:text-teal-300">
              <strong>Email sent to:</strong> {userEmail}
            </p>
          </div>

          {resendMessage && (
            <div className={`border rounded-lg p-4 mb-6 ${
              resendMessage.includes('successfully')
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {resendMessage}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 dark:disabled:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
            >
              {resendLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={handleBackToLogin}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Back to Login
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            <p>Didn&apos;t receive the email? Check your spam folder or try resending.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl px-8 pt-8 pb-8 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-10">
          {/* Company Logo */}
          <div className="mx-auto w-16 h-16 mb-6 relative">
            <Image 
              src="/logo.png" 
              alt="EurosHub Logo" 
              width={64}
              height={64}
              className="object-contain filter drop-shadow-sm"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent">
            EurosHub PM
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Welcome back! Sign in to your account</p>
        </div>

        {sessionExpired && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-xl mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Your session has expired. Please sign in again.
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-4 py-3 border rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                fieldErrors.email ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter your email"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className={`w-full px-4 py-3 pr-12 border rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                  fieldErrors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter your password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-800 transform transition-all duration-200 hover:scale-105 ${
                loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign in
                </div>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help? Contact your system administrator
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              © {new Date().getFullYear()} EurosHub PM. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reset Password</h2>
                    <p className="text-teal-100 text-sm">Request password reset</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseForgotPassword}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-teal-100 to-teal-200 dark:from-teal-800 dark:to-teal-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-teal-600 dark:text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  Enter your email address and we&apos;ll send your request to administrators for approval.
                  They will reset your password and send you new credentials.
                </p>
              </div>

              {forgotPasswordMessage && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {forgotPasswordMessage}
                </div>
              )}

              {forgotPasswordError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {forgotPasswordError}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="forgot-email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl focus:outline-none focus:border-teal-500 transition-colors"
                    placeholder="Enter your email address"
                    disabled={forgotPasswordLoading}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseForgotPassword}
                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      'Send Request'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginForm(props: LoginFormProps) {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto bg-white shadow-2xl rounded-lg px-8 pt-6 pb-8 mb-4"><div className="animate-pulse h-96"></div></div>}>
      <LoginFormContent {...props} />
    </Suspense>
  );
}