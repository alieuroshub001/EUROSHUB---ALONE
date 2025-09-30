'use client';

import React, { useState } from 'react';
import { PasswordResetRequest } from '@/lib/passwordResetService';

interface PasswordResetModalProps {
  request: PasswordResetRequest;
  onClose: () => void;
  onProcess: (requestId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>;
}

export default function PasswordResetModal({ request, onClose, onProcess }: PasswordResetModalProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onProcess(request.id, action, notes);
    } catch  {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Process Password Reset Request</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* Request Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Request Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">User:</span>{' '}
                <span className="text-gray-900">{request.user.firstName} {request.user.lastName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Email:</span>{' '}
                <span className="text-gray-900">{request.user.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Role:</span>{' '}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  {
                    superadmin: 'bg-purple-100 text-purple-800',
                    admin: 'bg-blue-100 text-blue-800',
                    hr: 'bg-green-100 text-green-800',
                    employee: 'bg-gray-100 text-gray-800',
                    client: 'bg-orange-100 text-orange-800'
                  }[request.user.role] || 'bg-gray-100 text-gray-800'
                }`}>
                  {request.user.role}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Requested:</span>{' '}
                <span className="text-gray-900">{formatDate(request.requestedAt)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Request Age:</span>{' '}
                <span className="text-gray-900">
                  {request.requestAge === 0 ? 'Today' :
                   request.requestAge === 1 ? '1 day ago' :
                   `${request.requestAge} days ago`}
                </span>
              </div>
            </div>
          </div>

          {/* Action Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="action"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={(e) => setAction(e.target.value as 'approve')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-900">
                    <span className="font-medium text-green-600">Approve</span> - Generate new password and send to user
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="action"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => setAction(e.target.value as 'reject')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-900">
                    <span className="font-medium text-red-600">Reject</span> - Deny the password reset request
                  </span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes {action === 'reject' && <span className="text-red-500">(required for rejection)</span>}
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  action === 'approve'
                    ? 'Optional notes about the approval...'
                    : 'Please provide a reason for rejection...'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                maxLength={500}
                required={action === 'reject'}
              />
              <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
            </div>

            {/* Warning for action */}
            <div className={`p-3 rounded-md ${
              action === 'approve' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {action === 'approve' ? (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${
                    action === 'approve' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {action === 'approve'
                      ? 'A new secure password will be generated and sent to the user via email. The user will need to change it on first login.'
                      : 'The user will be notified that their password reset request has been rejected. They can submit a new request if needed.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (action === 'reject' && !notes.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  action === 'approve' ? 'Approve Request' : 'Reject Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}