'use client';

import React, { useState, useEffect } from 'react';
import { PasswordResetRequest, passwordResetService } from '@/lib/passwordResetService';
import { User as AuthUser } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Key, Clock, CheckCircle2, XCircle, Mail, Users } from 'lucide-react';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (action === 'approve') {
        toast.success(result.message, { duration: 5000 });
      } else {
        toast.success('Password reset request rejected', { duration: 4000 });
      }

      // If password was generated but email failed, show it
      if (result.newPassword) {
        toast.error(`Email failed to send. New password: ${result.newPassword}`, {
          duration: 10000,
        });
      }

      // Reload requests
      await loadRequests();
      setShowModal(false);
      setSelectedRequest(null);
    } catch (err: unknown) {
      const error = err as { message: string };
      toast.error(`Failed to process request: ${error.message}`);
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
        <div className="w-12 h-12 border-2 border-gray-200 border-t-[#17b6b2] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
            <Key className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Requests</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadRequests}
            className="bg-[#17b6b2] hover:bg-[#15a09d] text-white px-6 py-2 rounded-lg transition-colors"
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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <Key className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
            </div>
            Password Reset Requests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2 ml-[52px]">Review and process password reset requests</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pending', label: 'Pending', count: requests.filter(r => r.status === 'pending').length },
            { key: 'all', label: 'All Requests', count: requests.length },
            { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length }
          ].map(tab => (
            <button
              key={tab.key}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setFilter(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === tab.key
                  ? 'border-[#17b6b2] text-[#17b6b2]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  filter === tab.key ? 'bg-[#17b6b2]/10 text-[#17b6b2] border border-[#17b6b2]/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
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
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <Clock className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredRequests.filter(r => r.status === 'pending').length}</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Requests</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <CheckCircle2 className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredRequests.filter(r => r.status === 'approved').length}</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <XCircle className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredRequests.filter(r => r.status === 'rejected').length}</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <Users className="w-5 h-5 text-[#17b6b2]" strokeWidth={1.5} />
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredRequests.length}</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <Mail className="w-8 h-8 text-[#17b6b2]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No requests found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'pending'
                ? 'No pending password reset requests at the moment.'
                : `No ${filter} password reset requests found.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.user.firstName} {request.user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{request.user.email}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ROLE_COLORS[request.user.role as keyof typeof ROLE_COLORS] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {request.user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATUS_COLORS[request.status]
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(request.requestedAt)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {getRequestAge(request.requestAge)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">
                      {canProcessRequest(request) ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          className="text-[#17b6b2] hover:text-[#15a09d] transition-colors"
                        >
                          Process
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
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