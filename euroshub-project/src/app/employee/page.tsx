import DashboardLayout from '@/components/Dashboard/DashboardLayout';

export default function EmployeeDashboard() {
  return (
    <DashboardLayout role="employee" title="Employee Dashboard">
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              My Overview
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Active Tasks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      7
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Completed Tasks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      23
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Hours This Week
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      32
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Projects
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      3
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Today&apos;s Tasks
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Update project documentation</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                  In Progress
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Review code changes</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  High Priority
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Team standup meeting</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Scheduled
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button className="relative block w-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 border-dashed rounded-lg p-6 text-center hover:border-blue-300 dark:hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <span className="mt-2 block text-sm font-medium text-blue-900 dark:text-blue-300">
                  Clock In/Out
                </span>
              </button>
              <button className="relative block w-full bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 border-dashed rounded-lg p-6 text-center hover:border-green-300 dark:hover:border-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                <span className="mt-2 block text-sm font-medium text-green-900 dark:text-green-300">
                  Request Leave
                </span>
              </button>
              <button className="relative block w-full bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 border-dashed rounded-lg p-6 text-center hover:border-purple-300 dark:hover:border-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                <span className="mt-2 block text-sm font-medium text-purple-900 dark:text-purple-300">
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