'use client';

import React, { useState, useEffect } from 'react';
import { PasswordResetRequest, passwordResetService } from '@/lib/passwordResetService';
import { User as AuthUser } from '@/lib/auth';
import PasswordResetModal from './PasswordResetModal';

interface PasswordResetManagementProps {
  currentUser: AuthUser;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800'
};

const ROLE_COLORS = {
  superadmin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  hr: 'bg-green-100 text-green-800',
  employee: 'bg-gray-100 text-gray-800',
  client: 'bg-orange-100 text-orange-800'
};

export default function PasswordResetManagement({ currentUser }: PasswordResetManagementProps) {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      let result;
      if (filter === 'pending') {
        result = await passwordResetService.getPendingRequests();
        setRequests(result.requests);
      } else {
        result = await passwordResetService.getAllRequests(1, 50, filter);
        setRequests(result.requests);
      }
    } catch (err: unknown) {
      const error = err as { message: string };
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const result = await passwordResetService.processRequest({
        requestId,
        action,
        notes
      });

      // Show success message
      alert(result.message);

      // If password was generated but email failed, show it
      if (result.newPassword) {
        alert(`Email failed to send. New password: ${result.newPassword}`);
      }

      // Reload requests
      await loadRequests();
      setShowModal(false);
      setSelectedRequest(null);
    } catch (err: unknown) {
      const error = err as { message: string };
      alert(`Failed to process request: ${error.message}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequestAge = (age: number) => {
    if (age === 0) return 'Today';
    if (age === 1) return '1 day ago';
    return `${age} days ago`;
  };

  const canProcessRequest = (request: PasswordResetRequest) => {
    if (request.status !== 'pending') return false;

    // Role-based access control
    if (currentUser.role === 'hr' && request.user.role !== 'employee') return false;
    if (currentUser.role === 'admin' && request.user.role === 'superadmin') return false;

    return true;
  };

  const filteredRequests = requests.filter(request => {
    // Apply role-based filtering
    if (currentUser.role === 'hr' && request.user.role !== 'employee') return false;
    if (currentUser.role === 'admin' && request.user.role === 'superadmin') return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error Loading Requests</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRequests}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Password Reset Requests</h2>
          <p className="text-gray-600 mt-1">Review and process password reset requests</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
            { key: 'all', label: 'All Requests', count: requests.length },
            { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  filter === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRequests.filter(r => r.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRequests.filter(r => r.status === 'approved').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRequests.filter(r => r.status === 'rejected').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRequests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {filter === 'pending'
                ? 'No pending password reset requests at the moment.'
                : `No ${filter} password reset requests found.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.user.firstName} {request.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{request.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ROLE_COLORS[request.user.role as keyof typeof ROLE_COLORS] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {request.user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATUS_COLORS[request.status]
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.requestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getRequestAge(request.requestAge)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canProcessRequest(request) ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Process
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          {request.status !== 'pending' ? 'Processed' : 'No Access'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Process Request Modal */}
      {showModal && selectedRequest && (
        <PasswordResetModal
          request={selectedRequest}
          onClose={() => {
            setShowModal(false);
            setSelectedRequest(null);
          }}
          onProcess={handleProcessRequest}
        />
      )}
    </div>
  );
}