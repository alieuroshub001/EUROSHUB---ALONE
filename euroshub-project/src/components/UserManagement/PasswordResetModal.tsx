'use client';

import React, { useState } from 'react';
import { PasswordResetRequest } from '@/lib/passwordResetService';
import { User, Mail, Calendar, Clock, Shield, AlertCircle, CheckCircle2, Lock, FileText, XCircle } from 'lucide-react';

interface PasswordResetModalProps {
  request: PasswordResetRequest;
  onClose: () => void;
  onProcess: (requestId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>;
}

export default function PasswordResetModal({ request, onClose, onProcess }: PasswordResetModalProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (action === 'reject' && !notes.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onProcess(request.id, action, notes.trim() || undefined);
    } catch {
      // Error is handled in parent component
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleInfo = (role: string) => {
    const roleInfo: Record<string, { color: string; bg: string; description: string }> = {
      superadmin: {
        color: 'text-red-700 dark:text-red-300',
        bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        description: 'Full system access and control'
      },
      admin: {
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
        description: 'Administrative privileges'
      },
      hr: {
        color: 'text-purple-700 dark:text-purple-300',
        bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
        description: 'Human resources management'
      },
      employee: {
        color: 'text-green-700 dark:text-green-300',
        bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        description: 'Standard employee access'
      },
      client: {
        color: 'text-orange-700 dark:text-orange-300',
        bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
        description: 'Client portal access'
      }
    };
    return roleInfo[role] || roleInfo.employee;
  };

  const roleInfo = getRoleInfo(request.user.role);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-8 py-6 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Process Password Reset Request</h2>
                <p className="text-blue-100 text-sm mt-0.5">Review and approve or reject the reset request</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 p-8 space-y-6">
              {/* User Information Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Details of the user requesting password reset</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Full Name
                    </label>
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {request.user.firstName} {request.user.lastName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address
                    </label>
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {request.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      User Role
                    </label>
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md border ${roleInfo.bg} ${roleInfo.color}`}>
                        {request.user.role.charAt(0).toUpperCase() + request.user.role.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Request Age
                    </label>
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {request.requestAge === 0 ? 'Today' :
                         request.requestAge === 1 ? '1 day ago' :
                         `${request.requestAge} days ago`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Requested Date & Time
                    </label>
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatDate(request.requestedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Selection Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Action</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Choose whether to approve or reject this request</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Approve Option */}
                  <div
                    className={`relative rounded-lg p-5 cursor-pointer transition-all border-2 ${
                      action === 'approve'
                        ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => setAction('approve')}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        action === 'approve'
                          ? 'border-green-500 dark:border-green-400 bg-green-500 dark:bg-green-400'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}>
                        {action === 'approve' && (
                          <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <span className="text-base font-semibold text-gray-900 dark:text-white">
                            Approve Request
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          Generate a new secure password and send it to the user via email. User must change it on first login.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reject Option */}
                  <div
                    className={`relative rounded-lg p-5 cursor-pointer transition-all border-2 ${
                      action === 'reject'
                        ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => setAction('reject')}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        action === 'reject'
                          ? 'border-red-500 dark:border-red-400 bg-red-500 dark:bg-red-400'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}>
                        {action === 'reject' && (
                          <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <span className="text-base font-semibold text-gray-900 dark:text-white">
                            Reject Request
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          Deny the password reset request. User will be notified and can submit a new request if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Notes</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {action === 'reject' ? 'Provide a reason for rejection (required)' : 'Add optional notes about this approval'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes {action === 'reject' && <span className="text-red-500 dark:text-red-400">*</span>}
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onFocus={() => setFocusedField('notes')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={
                      action === 'approve'
                        ? 'Optional notes about the approval (e.g., verified identity via phone call)...'
                        : 'Please provide a clear reason for rejection (e.g., unable to verify identity, suspicious activity)...'
                    }
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                      focusedField === 'notes'
                        ? 'border-gray-900 dark:border-gray-300 focus:ring-gray-900 dark:focus:ring-gray-300'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    rows={4}
                    maxLength={500}
                    required={action === 'reject'}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{notes.length}/500 characters</p>
                    {action === 'reject' && !notes.trim() && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        Rejection reason is required
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning Notice */}
              <div className={`border-2 rounded-lg p-5 ${
                action === 'approve'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {action === 'approve' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-semibold mb-2 ${
                      action === 'approve'
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}>
                      {action === 'approve' ? 'Approval Process' : 'Rejection Process'}
                    </h4>
                    <ul className={`space-y-1.5 text-sm ${
                      action === 'approve'
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {action === 'approve' ? (
                        <>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>A secure temporary password will be generated automatically</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Credentials will be sent to the user&apos;s email address</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>User must change the password on first login for security</span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-start">
                            <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>User will be notified via email about the rejection</span>
                          </li>
                          <li className="flex items-start">
                            <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>Your rejection reason will be included in the notification</span>
                          </li>
                          <li className="flex items-start">
                            <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>User can submit a new request if they still need access</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="px-8 py-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0 rounded-b-2xl">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span>This action will be recorded in the system</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || (action === 'reject' && !notes.trim())}
                  className={`px-8 py-2.5 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100 ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:bg-green-600 dark:hover:bg-green-700 dark:disabled:bg-green-800 text-white'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:bg-red-600 dark:hover:bg-red-700 dark:disabled:bg-red-800 text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {action === 'approve' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Request</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Reject Request</span>
                        </>
                      )}
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