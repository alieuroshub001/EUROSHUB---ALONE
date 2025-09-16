'use client';

import React, { useState } from 'react';
import { PasswordResetRequest } from '@/lib/passwordResetService';

interface ProcessRequestModalProps {
  request: PasswordResetRequest;
  onClose: () => void;
  onProcess: (requestId: string, action: 'approve' | 'reject', notes?: string) => void;
}

export default function ProcessRequestModal({ request, onClose, onProcess }: ProcessRequestModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;

    setProcessing(true);
    try {
      await onProcess(request.id, action, notes.trim() || undefined);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      superadmin: 'bg-red-100 text-red-800',
      admin: 'bg-blue-100 text-blue-800',
      hr: 'bg-purple-100 text-purple-800',
      employee: 'bg-green-100 text-green-800',
      client: 'bg-orange-100 text-orange-800'
    };

    const colorClass = roleColors[role as keyof typeof roleColors] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-6 py-4 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Process Password Reset</h2>
                <p className="text-blue-100 text-sm">Review and approve/reject request</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Request Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Request Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">User:</span>
                <div className="font-medium text-gray-900">
                  {request.user.firstName} {request.user.lastName}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <div className="font-medium text-gray-900">{request.user.email}</div>
              </div>
              <div>
                <span className="text-gray-600">Role:</span>
                <div className="mt-1">{getRoleBadge(request.user.role)}</div>
              </div>
              <div>
                <span className="text-gray-600">Requested:</span>
                <div className="font-medium text-gray-900">{formatDate(request.requestedAt)}</div>
              </div>
              <div>
                <span className="text-gray-600">Request Age:</span>
                <div className={`font-medium ${request.requestAge > 3 ? 'text-red-600' : 'text-gray-900'}`}>
                  {request.requestAge} day{request.requestAge !== 1 ? 's' : ''}
                  {request.requestAge > 3 && ' ⚠️'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    🕒 Pending
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Action *</label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-green-50 hover:border-green-200">
                  <input
                    type="radio"
                    name="action"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={(e) => setAction(e.target.value as 'approve')}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="text-green-600 mr-2">✅</span>
                      <span className="font-medium text-gray-900">Approve Request</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Generate a new secure password and send it to the user via email.
                    </p>
                  </div>
                </label>

                <label className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all hover:bg-red-50 hover:border-red-200">
                  <input
                    type="radio"
                    name="action"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => setAction(e.target.value as 'reject')}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="text-red-600 mr-2">❌</span>
                      <span className="font-medium text-gray-900">Reject Request</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Deny the password reset request and notify the user.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {action === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder={
                  action === 'approve'
                    ? 'Optional notes for internal tracking...'
                    : action === 'reject'
                    ? 'Please provide a reason for rejecting this request...'
                    : 'Add notes about your decision...'
                }
                maxLength={500}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {action === 'reject' ? 'Reason will be sent to the user.' : 'Internal notes only.'}
                </p>
                <p className="text-xs text-gray-500">{notes.length}/500</p>
              </div>
            </div>

            {/* Security Warning */}
            {action === 'approve' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">Security Information</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• A secure password will be generated automatically</li>
                      <li>• Credentials will be sent to the user&apos;s email address</li>
                      <li>• User must change password on first login</li>
                      <li>• This action will be logged for audit purposes</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!action || processing || (action === 'reject' && !notes.trim())}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center font-medium ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                    : action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {action === 'approve' ? (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve & Reset Password
                      </>
                    ) : action === 'reject' ? (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject Request
                      </>
                    ) : (
                      'Select Action'
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}