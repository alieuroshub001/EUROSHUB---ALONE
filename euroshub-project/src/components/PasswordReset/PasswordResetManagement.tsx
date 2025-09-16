'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/auth';
import { passwordResetService, PasswordResetRequest } from '@/lib/passwordResetService';
import PasswordResetList from './PasswordResetList';
import ProcessRequestModal from './ProcessRequestModal';

interface PasswordResetManagementProps {
  currentUser: User;
}

export default function PasswordResetManagement({ currentUser }: PasswordResetManagementProps) {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [processingRequest, setProcessingRequest] = useState<PasswordResetRequest | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    userEmail: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalRequests: 0
  });

  const loadRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      let result;
      if (activeTab === 'pending') {
        result = await passwordResetService.getPendingRequests(page, 20);
      } else {
        result = await passwordResetService.getAllRequests(page, 20, filters.status, filters.userEmail);
      }

      setRequests(result.requests);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err: unknown) {
      const error = err as { message: string };
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters.status, filters.userEmail]);

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const result = await passwordResetService.processRequest({ requestId, action, notes });

      // Show success message with new password if provided
      if (result.newPassword) {
        alert(`Request ${action}d successfully!\n\nNew Password: ${result.newPassword}\n\nPlease provide this password to the user as the email failed to send.`);
      } else {
        alert(result.message);
      }

      // Reload requests
      await loadRequests();
      setProcessingRequest(null);
    } catch (err: unknown) {
      const error = err as { message: string };
      alert(`Failed to ${action} request: ${error.message}`);
    }
  };

  const handleTabChange = (tab: 'pending' | 'all') => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  if (loading && requests.length === 0) {
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
            onClick={() => loadRequests()}
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
          <h1 className="text-3xl font-bold text-gray-900">Password Reset Management</h1>
          <p className="text-gray-600 mt-1">Review and process password reset requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTab === 'pending' ? pagination.totalRequests : requests.filter(r => r.status === 'pending').length}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {requests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{pagination.totalRequests}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          <button
            onClick={() => handleTabChange('pending')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Requests
            {activeTab === 'pending' && pagination.totalRequests > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {pagination.totalRequests}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('all')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Requests
          </button>
        </div>

        {/* Filters for All Requests tab */}
        {activeTab === 'all' && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                <input
                  type="email"
                  value={filters.userEmail}
                  onChange={(e) => handleFilterChange('userEmail', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Filter by email..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ status: 'all', userEmail: '' });
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request List */}
        <PasswordResetList
          requests={requests}
          currentUser={currentUser}
          onProcessRequest={setProcessingRequest}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => loadRequests(page)}
        />
      </div>

      {/* Process Request Modal */}
      {processingRequest && (
        <ProcessRequestModal
          request={processingRequest}
          onClose={() => setProcessingRequest(null)}
          onProcess={handleProcessRequest}
        />
      )}
    </div>
  );
}