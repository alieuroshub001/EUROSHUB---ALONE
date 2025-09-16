'use client';

import React from 'react';
import { User } from '@/lib/auth';
import { PasswordResetRequest } from '@/lib/passwordResetService';

interface PasswordResetListProps {
  requests: PasswordResetRequest[];
  currentUser: User;
  onProcessRequest: (request: PasswordResetRequest) => void;
  loading: boolean;
  pagination: {
    current: number;
    total: number;
    count: number;
    totalRequests: number;
  };
  onPageChange: (page: number) => void;
}

export default function PasswordResetList({
  requests,
  currentUser,
  onProcessRequest,
  loading,
  pagination,
  onPageChange
}: PasswordResetListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🕒' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔄' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  const canProcessRequest = (request: PasswordResetRequest) => {
    if (request.status !== 'pending') return false;

    // HR can only process employee requests
    if (currentUser.role === 'hr' && request.user.role !== 'employee') return false;

    // Admin cannot process superadmin requests
    if (currentUser.role === 'admin' && request.user.role === 'superadmin') return false;

    return ['superadmin', 'admin', 'hr'].includes(currentUser.role);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Password Reset Requests</h3>
        <p className="text-gray-600">There are no password reset requests to display.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
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
                Processed By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {request.user.firstName} {request.user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{request.user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(request.user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(request.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(request.requestedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm ${request.requestAge > 3 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {request.requestAge} day{request.requestAge !== 1 ? 's' : ''}
                    {request.requestAge > 3 && ' ⚠️'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.processor ? (
                    <div>
                      <div className="font-medium text-gray-900">
                        {request.processor.firstName} {request.processor.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.processedAt && formatDate(request.processedAt)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {canProcessRequest(request) ? (
                    <button
                      onClick={() => onProcessRequest(request)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-xs leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Process
                    </button>
                  ) : request.status === 'pending' ? (
                    <span className="text-gray-400 text-xs">No Permission</span>
                  ) : (
                    <span className="text-gray-400 text-xs">Processed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.current + 1)}
              disabled={pagination.current >= pagination.total}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(pagination.current - 1) * 20 + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(pagination.current * 20, pagination.totalRequests)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{pagination.totalRequests}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                  const page = Math.max(1, Math.min(pagination.current - 2 + i, pagination.total - 4 + i + 1));
                  if (page > pagination.total) return null;

                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === pagination.current
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => onPageChange(pagination.current + 1)}
                  disabled={pagination.current >= pagination.total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}