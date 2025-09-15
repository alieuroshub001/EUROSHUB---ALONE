import DashboardLayout from '@/components/Dashboard/DashboardLayout';

export default function EmployeeDashboard() {
  return (
    <DashboardLayout role="employee" title="Employee Dashboard">
      <div className="space-y-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              My Overview
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Tasks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      7
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-green-50 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Completed Tasks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      23
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-yellow-50 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Hours This Week
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      32
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-purple-50 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Projects
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      3
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Today&apos;s Tasks
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-900">Update project documentation</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  In Progress
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-900">Review code changes</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  High Priority
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-900">Team standup meeting</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Scheduled
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button className="relative block w-full bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg p-6 text-center hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <span className="mt-2 block text-sm font-medium text-blue-900">
                  Clock In/Out
                </span>
              </button>
              <button className="relative block w-full bg-green-50 border-2 border-green-200 border-dashed rounded-lg p-6 text-center hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                <span className="mt-2 block text-sm font-medium text-green-900">
                  Request Leave
                </span>
              </button>
              <button className="relative block w-full bg-purple-50 border-2 border-purple-200 border-dashed rounded-lg p-6 text-center hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                <span className="mt-2 block text-sm font-medium text-purple-900">
                  View Timesheet
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}